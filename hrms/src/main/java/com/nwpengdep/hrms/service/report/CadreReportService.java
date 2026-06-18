package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.CadreReportRequest;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.dto.CadreReportRowResponse;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.service.report.CadreHistoricalStateService.EmployeeSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CadreReportService {

    private final DesignationRepository designationRepository;
    private final CadrePositionRepository cadrePositionRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final CadreHistoricalStateService historicalStateService;

    @Transactional(readOnly = true)
    public CadreReportResponse generateReport(CadreReportRequest request) {
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new RuntimeException(
                    "Start date must be before or equal to end date"
            );
        }

        List<Designation> designations = designationRepository.findAll();
        designations.sort(Comparator.comparing(Designation::getDesignationName));

        Map<Long, Integer> approvedCadreMap = cadrePositionRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        cadre -> cadre.getDesignation().getId(),
                        CadrePosition::getApprovedCount,
                        (a, b) -> b
                ));

        String nwpDepartment = DepartmentConstants.NWP_ENGINEERING;

        Map<Long, Long> transferInMap = toCountMap(
                employeeActionRepository.countGroupedByNewDesignationAndDepartment(
                        EmployeeActionType.TRANSFER_IN,
                        nwpDepartment,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> transferOutMap = toCountMap(
                employeeActionRepository.countGroupedByOldDesignationAndFromDepartment(
                        EmployeeActionType.TRANSFER_OUT,
                        nwpDepartment,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> retiredMap = toCountMap(
                employeeActionRepository.countGroupedByOldDesignation(
                        EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> deathsMap = toCountMap(
                employeeActionRepository.countGroupedByOldDesignation(
                        EmployeeActionType.DEATH,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> promotionsOutMap = toCountMap(
                employeeActionRepository.countGroupedByOldDesignationAndDepartment(
                        EmployeeActionType.PROMOTION,
                        nwpDepartment,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> newAppointmentsMap = toCountMap(
                employeeActionRepository.countGroupedByNewDesignationAndDepartment(
                        EmployeeActionType.NEW_APPOINTMENT,
                        nwpDepartment,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> promotionNewAppointmentsMap = toCountMap(
                employeeActionRepository.countPromotionInByDepartment(
                        EmployeeActionType.PROMOTION,
                        nwpDepartment,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        Map<Long, Long> dismissalsMap = toCountMap(
                employeeActionRepository.countGroupedByOldDesignation(
                        EmployeeActionType.DISMISSAL,
                        request.getStartDate(),
                        request.getEndDate()
                )
        );

        List<EmployeeAction> allActions =
                employeeActionRepository.findAllUpToDateOrdered(
                        request.getEndDate()
                );

        Map<Long, List<EmployeeAction>> actionsByEmployee = allActions.stream()
                .collect(Collectors.groupingBy(
                        action -> action.getEmployee().getId()
                ));

        List<Employee> employees = employeeRepository.findAllWithDesignation();

        Map<Long, Long> startCountMap = new HashMap<>();
        Map<Long, Long> endPermanentMap = new HashMap<>();
        Map<Long, Long> endCasualMap = new HashMap<>();
        Map<Long, Long> endSubstituteMap = new HashMap<>();
        Map<Long, Long> endContractMap = new HashMap<>();

        for (Employee employee : employees) {
            List<EmployeeAction> employeeActions =
                    actionsByEmployee.getOrDefault(
                            employee.getId(),
                            List.of()
                    );

            EmployeeSnapshot startSnapshot = historicalStateService.snapshotAt(
                    employee,
                    request.getStartDate(),
                    employeeActions
            );

            if (startSnapshot.active() && startSnapshot.designationId() != null) {
                startCountMap.merge(startSnapshot.designationId(), 1L, Long::sum);
            }

            EmployeeSnapshot endSnapshot = historicalStateService.snapshotAt(
                    employee,
                    request.getEndDate(),
                    employeeActions
            );

            if (!endSnapshot.active() || endSnapshot.designationId() == null) {
                continue;
            }

            EmploymentType type = endSnapshot.employmentType() != null
                    ? endSnapshot.employmentType()
                    : EmploymentType.PERMANENT;

            Long designationId = endSnapshot.designationId();

            switch (type) {
                case PERMANENT -> endPermanentMap.merge(designationId, 1L, Long::sum);
                case CASUAL -> endCasualMap.merge(designationId, 1L, Long::sum);
                case SUBSTITUTE -> endSubstituteMap.merge(designationId, 1L, Long::sum);
                case CONTRACT -> endContractMap.merge(designationId, 1L, Long::sum);
            }
        }

        List<CadreReportRowResponse> rows = new ArrayList<>();
        int serial = 1;

        for (Designation designation : designations) {
            Long designationId = designation.getId();

            long transferOut = transferOutMap.getOrDefault(designationId, 0L);
            long retired = retiredMap.getOrDefault(designationId, 0L);
            long deaths = deathsMap.getOrDefault(designationId, 0L);
            long dismissals = dismissalsMap.getOrDefault(designationId, 0L);
            long promotionOut = promotionsOutMap.getOrDefault(designationId, 0L);

            // Business logic not finalized yet: keep column but force value to 0.
            long vacationOfPost = 0;

            long permanent = endPermanentMap.getOrDefault(designationId, 0L);
            long casual = endCasualMap.getOrDefault(designationId, 0L);
            long substitute = endSubstituteMap.getOrDefault(designationId, 0L);
            long contracts = endContractMap.getOrDefault(designationId, 0L);
            long activeAtEnd = permanent + casual + substitute + contracts;

            long approvedCadre = approvedCadreMap.getOrDefault(designationId, 0);
            long vacancies = Math.max(0, approvedCadre - activeAtEnd);
            long excess = Math.max(0, activeAtEnd - approvedCadre);

            rows.add(
                    CadreReportRowResponse.builder()
                            .serialNo(serial++)
                            .designationId(designationId)
                            .designationName(designation.getDesignationName())
                            .serviceCode(
                                    designation.getService() != null
                                            ? designation.getService().getServiceCode()
                                            : "—"
                            )
                            .gradeClassDisplay(
                                    GradeDisplayFormatter.format(
                                            designation.getAllowedGrades()
                                    )
                            )
                            .salaryCode(
                                    designation.getSalaryCode() != null
                                            ? designation.getSalaryCode()
                                            : "—"
                            )
                            .serviceLevelName(
                                    designation.getServiceLevel() != null
                                            ? designation.getServiceLevel()
                                                    .getLevelName()
                                            : "—"
                            )
                            .finalApprovedCadre(approvedCadre)
                            .employeesAtStartDate(
                                    startCountMap.getOrDefault(designationId, 0L)
                            )
                            .transferIn(transferInMap.getOrDefault(designationId, 0L))
                            .transferOut(transferOut)
                            .retiredResignation(retired)
                            .deaths(deaths)
                            .promotionsIn(promotionsOutMap.getOrDefault(designationId, 0L))
                            .newAppointments(
                                    newAppointmentsMap.getOrDefault(designationId, 0L)
                                            + promotionNewAppointmentsMap.getOrDefault(
                                                    designationId,
                                                    0L
                                            )
                            )
                            .dismissals(dismissals)
                            .vacationOfPost(vacationOfPost)
                            .permanent(permanent)
                            .vacancies(vacancies)
                            .excess(excess)
                            .casual(casual)
                            .substitute(substitute)
                            .contracts(contracts)
                            .totalStaff(permanent + casual + substitute + contracts)
                            .build()
            );
        }

        CadreReportRowResponse totals = buildTotalsRow(rows);

        return CadreReportResponse.builder()
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .generatedAt(LocalDateTime.now())
                .rows(rows)
                .totals(totals)
                .build();
    }

    private CadreReportRowResponse buildTotalsRow(List<CadreReportRowResponse> rows) {
        return CadreReportRowResponse.builder()
                .serialNo(null)
                .designationName("TOTAL")
                .serviceCode("")
                .gradeClassDisplay("")
                .salaryCode("")
                .serviceLevelName("")
                .finalApprovedCadre(sum(rows, CadreReportRowResponse::getFinalApprovedCadre))
                .employeesAtStartDate(sum(rows, CadreReportRowResponse::getEmployeesAtStartDate))
                .transferIn(sum(rows, CadreReportRowResponse::getTransferIn))
                .transferOut(sum(rows, CadreReportRowResponse::getTransferOut))
                .retiredResignation(sum(rows, CadreReportRowResponse::getRetiredResignation))
                .deaths(sum(rows, CadreReportRowResponse::getDeaths))
                .promotionsIn(sum(rows, CadreReportRowResponse::getPromotionsIn))
                .newAppointments(sum(rows, CadreReportRowResponse::getNewAppointments))
                .dismissals(sum(rows, CadreReportRowResponse::getDismissals))
                .vacationOfPost(0)
                .permanent(sum(rows, CadreReportRowResponse::getPermanent))
                .vacancies(sum(rows, CadreReportRowResponse::getVacancies))
                .excess(sum(rows, CadreReportRowResponse::getExcess))
                .casual(sum(rows, CadreReportRowResponse::getCasual))
                .substitute(sum(rows, CadreReportRowResponse::getSubstitute))
                .contracts(sum(rows, CadreReportRowResponse::getContracts))
                .totalStaff(sum(rows, CadreReportRowResponse::getTotalStaff))
                .totalsRow(true)
                .build();
    }

    private long sum(
            List<CadreReportRowResponse> rows,
            java.util.function.ToLongFunction<CadreReportRowResponse> mapper
    ) {
        return rows.stream().mapToLong(mapper).sum();
    }

    private Map<Long, Long> toCountMap(List<Object[]> grouped) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : grouped) {
            if (row[0] == null) {
                continue;
            }
            map.put((Long) row[0], (Long) row[1]);
        }
        return map;
    }
}
