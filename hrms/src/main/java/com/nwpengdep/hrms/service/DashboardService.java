package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int RETIREMENT_AGE_YEARS = 60;
    private static final int RETIREMENT_WATCH_MONTHS = 24;
    private static final List<Grade> GRADE_ORDER = List.of(
            Grade.III,
            Grade.II,
            Grade.I,
            Grade.SUPRA,
            Grade.SPECIAL
    );

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingService employeePostingService;
    private final CadrePositionRepository cadrePositionRepository;
    private final ServiceLevelRepository serviceLevelRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final CareerProgressionService careerProgressionService;

    public DashboardStatsResponse getDashboardStats() {
        List<Employee> activeNwpEmployees = getActiveNwpEmployees();
        long currentPostings = employeePostingService.getCurrentPostings()
                .stream()
                .filter(posting -> posting.getEmployee() != null
                        && isNwpEmployee(posting.getEmployee()))
                .count();

        return DashboardStatsResponse.builder()
                .totalEmployees(activeNwpEmployees.size())
                .totalDesignations(designationRepository.count())
                .currentPostings((int) currentPostings)
                .build();
    }

    public DashboardSummaryDto getDashboardSummary() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        long totalEmployees = activeEmployees.size();
        List<CadreStatusDto> cadreStatuses = getCadreStatus();
        long approvedCadre = cadrePositionRepository.findAll()
                .stream()
                .mapToLong(cp -> cp.getApprovedCount() != null
                        ? cp.getApprovedCount().longValue()
                        : 0L)
                .sum();
        long totalVacancies = cadreStatuses.stream()
                .mapToLong(CadreStatusDto::getVacancy)
                .sum();
        long totalExcess = cadreStatuses.stream()
                .mapToLong(cadre -> Math.max(0, cadre.getExisting() - cadre.getApproved()))
                .sum();

        long retirementWatch = countRetiringWithinMonths(RETIREMENT_WATCH_MONTHS);
        LocalDate recentlyQualifiedCutoff = LocalDate.now().minusDays(30);

        return DashboardSummaryDto.builder()
                .totalEmployees((int) totalEmployees)
                .activeEmployees((int) totalEmployees)
                .approvedCadre((int) approvedCadre)
                .vacancies((int) totalVacancies)
                .excessEmployees((int) totalExcess)
                .retirementWatch((int) retirementWatch)
                .probationEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus() == null
                                || employee.getPermanentStatus() == PermanentStatus.PROBATION)
                        .count()))
                .qualifiedForPermanentEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus()
                                == PermanentStatus.QUALIFIED_FOR_PERMANENT)
                        .count()))
                .permanentEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus()
                                == PermanentStatus.PERMANENT)
                        .count()))
                .eligibleForPermanent(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForPermanent()))
                        .count()))
                .eligibleForGrade2(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade2()))
                        .count()))
                .eligibleForGrade1(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade1()))
                        .count()))
                .eligibleGrade3To2(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getGrade() == Grade.III)
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade2()))
                        .count()))
                .eligibleGrade2To1(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getGrade() == Grade.II)
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade1()))
                        .count()))
                .recentlyQualified(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> {
                            EmployeeCareerProgression progression =
                                    employee.getCareerProgression();
                            return recentlyQualified(
                                    progression.getPermanentQualificationDate(),
                                    recentlyQualifiedCutoff
                            ) || recentlyQualified(
                                    progression.getGrade2EligibilityDate(),
                                    recentlyQualifiedCutoff
                            ) || recentlyQualified(
                                    progression.getGrade1EligibilityDate(),
                                    recentlyQualifiedCutoff
                            );
                        })
                        .count()))
                .missingQualifications(countMissingQualifications(activeEmployees))
                .promotionsThisYear(getPromotionsThisYear())
                .newAppointmentsThisYear(getNewAppointmentsThisYear())
                .build();
    }

    private boolean recentlyQualified(
            LocalDate qualificationDate,
            LocalDate cutoff
    ) {
        return qualificationDate != null
                && !qualificationDate.isBefore(cutoff)
                && !qualificationDate.isAfter(LocalDate.now());
    }

    public List<EmployeeDistributionDto> getServiceLevelDistribution() {
        List<Employee> activeNwpEmployees = getActiveNwpEmployees();
        List<ServiceLevel> serviceLevels = serviceLevelRepository.findAll();
        return serviceLevels.stream()
                .map(sl -> EmployeeDistributionDto.builder()
                        .category(sl.getLevelName())
                        .count(activeNwpEmployees.stream()
                                .filter(employee -> employee.getServiceLevel() != null
                                        && sl.getId().equals(employee.getServiceLevel().getId()))
                                .count())
                        .build())
                .filter(dto -> dto.getCount() > 0)
                .collect(Collectors.toList());
    }

    public List<EmployeeDistributionDto> getServiceDistribution() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        return activeEmployees.stream()
                .filter(e -> e.getDesignation() != null && e.getDesignation().getService() != null)
                .collect(Collectors.groupingBy(
                        e -> {
                            String code = e.getDesignation().getService().getServiceCode();
                            return code != null && !code.isEmpty() ? code : e.getDesignation().getService().getDescription();
                        },
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .map(entry -> EmployeeDistributionDto.builder()
                        .category(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .sorted(Comparator.comparingLong(EmployeeDistributionDto::getCount).reversed())
                .collect(Collectors.toList());
    }

    public List<EmployeeDistributionDto> getDesignationDistribution() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        Map<String, Long> countsByName = activeEmployees.stream()
                .filter(employee -> employee.getDesignation() != null)
                .collect(Collectors.groupingBy(
                        employee -> employee.getDesignation().getDesignationName(),
                        Collectors.counting()
                ));

        return designationRepository.findAll()
                .stream()
                .map(designation -> EmployeeDistributionDto.builder()
                        .category(designation.getDesignationName())
                        .count(countsByName.getOrDefault(designation.getDesignationName(), 0L))
                        .build())
                .sorted(Comparator
                        .comparingLong(EmployeeDistributionDto::getCount).reversed()
                        .thenComparing(
                                EmployeeDistributionDto::getCategory,
                                String.CASE_INSENSITIVE_ORDER
                        ))
                .collect(Collectors.toList());
    }

    public List<EmployeeDistributionDto> getGradeDistribution() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        return GRADE_ORDER.stream()
                .map(grade -> {
                    long count = activeEmployees.stream()
                            .filter(e -> grade.equals(e.getGrade()))
                            .count();
                    return EmployeeDistributionDto.builder()
                            .category("Grade " + grade.getLabel())
                            .count(count)
                            .build();
                })
                .filter(dto -> dto.getCount() > 0)
                .collect(Collectors.toList());
    }

    public List<EmployeeDistributionDto> getPermanentStatusDistribution() {
        DashboardSummaryDto summary = getDashboardSummary();
        List<EmployeeDistributionDto> distribution = new ArrayList<>();
        if (summary.getProbationEmployees() != null && summary.getProbationEmployees() > 0) {
            distribution.add(EmployeeDistributionDto.builder()
                    .category("Probation")
                    .count(summary.getProbationEmployees().longValue())
                    .build());
        }
        if (summary.getQualifiedForPermanentEmployees() != null
                && summary.getQualifiedForPermanentEmployees() > 0) {
            distribution.add(EmployeeDistributionDto.builder()
                    .category("Qualified for Permanent")
                    .count(summary.getQualifiedForPermanentEmployees().longValue())
                    .build());
        }
        if (summary.getPermanentEmployees() != null && summary.getPermanentEmployees() > 0) {
            distribution.add(EmployeeDistributionDto.builder()
                    .category("Confirmed Permanent")
                    .count(summary.getPermanentEmployees().longValue())
                    .build());
        }
        return distribution;
    }

    public List<DistrictWorkplaceDistributionDto> getWorkplaceDistributionByDistrict() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        return Arrays.stream(District.values())
                .map(district -> {
                    List<Employee> districtEmployees = activeEmployees.stream()
                            .filter(employee -> district.equals(employee.getCurrentDistrictOfWorking()))
                            .toList();

                    Map<String, Long> officeCounts = districtEmployees.stream()
                            .collect(Collectors.groupingBy(
                                    employee -> {
                                        String label = resolveWorkplaceLabel(employee);
                                        return label == null || label.isBlank()
                                                ? "Not specified"
                                                : label;
                                    },
                                    Collectors.counting()
                            ));

                    List<EmployeeDistributionDto> workplaces = officeCounts.entrySet()
                            .stream()
                            .sorted((left, right) -> {
                                if ("Not specified".equals(left.getKey())) {
                                    return 1;
                                }
                                if ("Not specified".equals(right.getKey())) {
                                    return -1;
                                }
                                return Long.compare(right.getValue(), left.getValue());
                            })
                            .map(entry -> EmployeeDistributionDto.builder()
                                    .category(entry.getKey())
                                    .count(entry.getValue())
                                    .build())
                            .collect(Collectors.toList());

                    return DistrictWorkplaceDistributionDto.builder()
                            .district(district.getLabel())
                            .workplaces(workplaces)
                            .build();
                })
                .filter(dto -> dto.getWorkplaces() != null && !dto.getWorkplaces().isEmpty())
                .collect(Collectors.toList());
    }

    public RetirementForecastDto getRetirementForecast() {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        List<Employee> activeEmployees = getActiveNwpEmployees();

        long thisYear = activeEmployees.stream()
                .filter(e -> e.getDateOfBirth() != null)
                .filter(e -> e.getDateOfBirth().plusYears(RETIREMENT_AGE_YEARS).getYear()
                        == currentYear)
                .count();
        long withinTwoYears = countRetiringWithinMonths(24);
        long withinFiveYears = countRetiringWithinMonths(60);

        return RetirementForecastDto.builder()
                .retiringThisYear((int) thisYear)
                .retiringWithinTwoYears((int) withinTwoYears)
                .retiringWithinFiveYears((int) withinFiveYears)
                .build();
    }

    public List<CadreStatusDto> getCadreStatus() {
        return cadrePositionRepository.findAll()
                .stream()
                .map(cadre -> {
                    long approved = cadre.getApprovedCount() != null
                            ? cadre.getApprovedCount().longValue()
                            : 0L;
                    long existing = cadre.getDesignation() != null
                            ? employeeRepository.countByDesignationIdAndStatusAndCurrentDepartment(
                                    cadre.getDesignation().getId(),
                                    EmployeeStatus.ACTIVE,
                                    DepartmentConstants.NWP_ENGINEERING
                            )
                            : 0;
                    long vacancy = Math.max(0, approved - existing);
                    String vacancyStatus = vacancy == 0 ? "green" : vacancy <= 2 ? "orange" : "red";
                    return CadreStatusDto.builder()
                            .designation(cadre.getDesignation() != null ? 
                                    cadre.getDesignation().getDesignationName() : "Unknown")
                            .approved(approved)
                            .existing(existing)
                            .vacancy(vacancy)
                            .vacancyStatus(vacancyStatus)
                            .build();
                })
                .filter(dto -> dto.getApproved() > 0)
                .sorted(Comparator.comparingLong(CadreStatusDto::getVacancy).reversed())
                .collect(Collectors.toList());
    }

    public List<DistrictDistributionDto> getDistrictDistribution() {
        List<Employee> activeEmployees = getActiveNwpEmployees();
        List<DistrictDistributionDto> distribution = Arrays.stream(District.values())
                .map(district -> {
                    long count = activeEmployees.stream()
                            .filter(e -> district.equals(e.getCurrentDistrictOfWorking()))
                            .count();
                    return DistrictDistributionDto.builder()
                            .district(district.getLabel())
                            .employeeCount(count)
                            .build();
                })
                .filter(dto -> dto.getEmployeeCount() != null && dto.getEmployeeCount() > 0)
                .sorted(Comparator.comparingLong(DistrictDistributionDto::getEmployeeCount).reversed())
                .collect(Collectors.toList());

        long unassignedCount = activeEmployees.stream()
                .filter(e -> e.getCurrentDistrictOfWorking() == null)
                .count();
        if (unassignedCount > 0) {
            distribution.add(DistrictDistributionDto.builder()
                    .district("Not assigned")
                    .employeeCount(unassignedCount)
                    .build());
        }

        distribution.sort((left, right) -> {
            if ("Not assigned".equals(left.getDistrict())) {
                return 1;
            }
            if ("Not assigned".equals(right.getDistrict())) {
                return -1;
            }
            return Long.compare(right.getEmployeeCount(), left.getEmployeeCount());
        });

        return distribution;
    }

    public List<EmployeeMovementDto> getRecentEmployeeMovements() {
        return employeeActionRepository.findRecentActions(PageRequest.of(0, 50))
                .stream()
                .filter(this::isNwpAction)
                .limit(10)
                .map(this::toEmployeeMovementDto)
                .collect(Collectors.toList());
    }

    public List<RetirementWatchDto> getRetirementWatchList() {
        LocalDate today = LocalDate.now();
        LocalDate minDateOfBirth = today.minusYears(RETIREMENT_AGE_YEARS);
        LocalDate maxDateOfBirth = minDateOfBirth.plusMonths(RETIREMENT_WATCH_MONTHS);

        List<Employee> retiringEmployees = employeeRepository.findRetiringSoon(
                EmployeeStatus.ACTIVE,
                minDateOfBirth,
                maxDateOfBirth
        );

        return retiringEmployees.stream()
                .filter(this::isNwpEmployee)
                .map(employee -> {
                    LocalDate dob = employee.getDateOfBirth();
                    if (dob == null) {
                        return null;
                    }

                    LocalDate expectedRetirementDate = dob.plusYears(RETIREMENT_AGE_YEARS);
                    long monthsRemaining = java.time.temporal.ChronoUnit.MONTHS.between(
                            today,
                            expectedRetirementDate
                    );
                    if (monthsRemaining < 0 || monthsRemaining > RETIREMENT_WATCH_MONTHS) {
                        return null;
                    }

                    return RetirementWatchDto.builder()
                            .employeeId(employee.getId())
                            .employeeName(employee.getFullName())
                            .designation(employee.getDesignation() != null ?
                                    employee.getDesignation().getDesignationName() : "Unknown")
                            .dateOfBirth(dob)
                            .retirementDate(expectedRetirementDate)
                            .remainingMonths((int) monthsRemaining)
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(RetirementWatchDto::getRemainingMonths))
                .limit(10)
                .collect(Collectors.toList());
    }

    public List<BirthdayDto> getBirthdaysThisMonth() {
        int currentMonth = LocalDate.now().getMonthValue();
        return employeeRepository.findBirthdaysInMonth(EmployeeStatus.ACTIVE, currentMonth)
                .stream()
                .filter(this::isNwpEmployee)
                .map(employee -> BirthdayDto.builder()
                        .employeeId(employee.getId())
                        .employeeName(employee.getFullName())
                        .dateOfBirth(employee.getDateOfBirth())
                        .build())
                .collect(Collectors.toList());
    }

    public List<RecentEmployeeDto> getRecentlyAddedEmployees() {
        return getActiveNwpEmployees()
                .stream()
                .sorted(Comparator
                        .comparing(
                                Employee::getCreatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())
                        )
                        .thenComparing(Employee::getId, Comparator.reverseOrder()))
                .limit(10)
                .map(employee -> RecentEmployeeDto.builder()
                        .employeeId(employee.getId())
                        .employeeName(employee.getFullName())
                        .designation(employee.getDesignation() != null ? 
                                employee.getDesignation().getDesignationName() : "Unknown")
                        .createdAt(employee.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public List<DashboardAlertDto> getDashboardAlerts() {
        List<DashboardAlertDto> alerts = new ArrayList<>();
        DashboardSummaryDto summary = getDashboardSummary();
        List<CadreStatusDto> cadreStatuses = getCadreStatus();

        if (summary.getQualifiedForPermanentEmployees() != null
                && summary.getQualifiedForPermanentEmployees() > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("PERMANENT_CONFIRMATION")
                    .category("PERMANENT")
                    .message("Employees qualified for permanent confirmation")
                    .severity("error")
                    .count(summary.getQualifiedForPermanentEmployees().longValue())
                    .actionPath("/employees")
                    .actionQuery("permanentStatus=QUALIFIED_FOR_PERMANENT")
                    .build());
        }

        if (summary.getEligibleGrade3To2() != null && summary.getEligibleGrade3To2() > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("GRADE_3_TO_2")
                    .category("PROMOTION")
                    .message("Employees eligible for Grade III to II assignment update")
                    .severity("error")
                    .count(summary.getEligibleGrade3To2().longValue())
                    .actionPath("/employees")
                    .actionQuery("gradePromotion=QUALIFIED_GRADE_3_TO_2")
                    .build());
        }

        if (summary.getEligibleGrade2To1() != null && summary.getEligibleGrade2To1() > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("GRADE_2_TO_1")
                    .category("PROMOTION")
                    .message("Employees eligible for Grade II to I assignment update")
                    .severity("error")
                    .count(summary.getEligibleGrade2To1().longValue())
                    .actionPath("/employees")
                    .actionQuery("gradePromotion=QUALIFIED_GRADE_2_TO_1")
                    .build());
        }

        if (summary.getMissingQualifications() != null && summary.getMissingQualifications() > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("PENDING_QUALIFICATIONS")
                    .category("QUALIFICATION")
                    .message("Employees with pending qualification requirements")
                    .severity("warning")
                    .count(summary.getMissingQualifications().longValue())
                    .actionPath("/employees")
                    .actionQuery("qualification=ANY_PENDING")
                    .build());
        }

        long totalVacancies = cadreStatuses.stream()
                .mapToLong(CadreStatusDto::getVacancy).sum();
        if (totalVacancies > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("VACANCY")
                    .category("VACANCY")
                    .message("Total vacancies across cadres")
                    .severity(totalVacancies > 5 ? "error" : "warning")
                    .count(totalVacancies)
                    .actionPath("/vacancies")
                    .actionQuery(null)
                    .build());
        }

        long retiringIn6Months = countRetiringWithinMonths(6);
        if (retiringIn6Months > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("RETIREMENT")
                    .category("RETIREMENT")
                    .message("Employees retiring within 6 months")
                    .severity("warning")
                    .count(retiringIn6Months)
                    .actionPath("/employees")
                    .actionQuery("retiringWithin=6")
                    .build());
        }

        alerts.sort(Comparator.comparingInt(alert -> severityRank(alert.getSeverity())));
        return alerts;
    }

    public ComprehensiveDashboardDto getComprehensiveDashboard() {
        DashboardSummaryDto summary = getDashboardSummary();
        return ComprehensiveDashboardDto.builder()
                .summary(summary)
                .serviceLevelDistribution(getServiceLevelDistribution())
                .serviceDistribution(getServiceDistribution())
                .designationDistribution(getDesignationDistribution())
                .gradeDistribution(getGradeDistribution())
                .permanentStatusDistribution(getPermanentStatusDistribution())
                .workplaceDistributionByDistrict(getWorkplaceDistributionByDistrict())
                .retirementForecast(getRetirementForecast())
                .cadreStatus(getCadreStatus())
                .districtDistribution(getDistrictDistribution())
                .recentMovements(getRecentEmployeeMovements())
                .retirementWatchList(getRetirementWatchList())
                .birthdaysThisMonth(getBirthdaysThisMonth())
                .recentlyAddedEmployees(getRecentlyAddedEmployees())
                .alerts(getDashboardAlerts())
                .build();
    }

    public int getNewAppointmentsThisYear() {
        LocalDate startOfYear = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate endOfYear = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        return Math.toIntExact(employeeActionRepository.findAll()
                .stream()
                .filter(a -> a.getDeleted() == null || !a.getDeleted())
                .filter(this::isNwpAction)
                .filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT)
                .filter(a -> !a.getActionDate().isBefore(startOfYear) && !a.getActionDate().isAfter(endOfYear))
                .count());
    }

    public int getPromotionsThisYear() {
        LocalDate startOfYear = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate endOfYear = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        return Math.toIntExact(employeeActionRepository.findAll()
                .stream()
                .filter(a -> a.getDeleted() == null || !a.getDeleted())
                .filter(this::isNwpAction)
                .filter(a -> a.getActionType() == EmployeeActionType.PROMOTION)
                .filter(a -> !a.getActionDate().isBefore(startOfYear) && !a.getActionDate().isAfter(endOfYear))
                .count());
    }

    private EmployeeMovementDto toEmployeeMovementDto(EmployeeAction action) {
        return EmployeeMovementDto.builder()
                .id(action.getId())
                .employeeId(action.getEmployee() != null
                        ? action.getEmployee().getId()
                        : null)
                .employeeName(action.getEmployee() != null ?
                        action.getEmployee().getFullName() : "Unknown")
                .actionType(action.getActionType().name())
                .actionDate(action.getActionDate())
                .description(action.getReason() != null
                        ? action.getReason()
                        : action.getActionType().name())
                .oldDesignation(action.getOldDesignation() != null ?
                        action.getOldDesignation().getDesignationName() : "-")
                .newDesignation(action.getNewDesignation() != null ?
                        action.getNewDesignation().getDesignationName() : "-")
                .build();
    }

    private int countMissingQualifications(List<Employee> activeEmployees) {
        return Math.toIntExact(activeEmployees.stream()
                .filter(employee -> employee.getEmploymentType() == EmploymentType.PERMANENT)
                .filter(this::qualifiesForPendingQualificationAlert)
                .count());
    }

    private boolean qualifiesForPendingQualificationAlert(Employee employee) {
        return careerProgressionService.completedThreeYears(employee)
                && hasPendingRequirements(employee);
    }

    private boolean hasPendingRequirements(Employee employee) {
        if (employee.getRequirements() == null || employee.getRequirements().isEmpty()) {
            return false;
        }
        return employee.getRequirements().stream()
                .anyMatch(requirement -> requirement.getStatus() == RequirementStatus.PENDING);
    }

    private long countRetiringWithinMonths(int months) {
        LocalDate today = LocalDate.now();
        return getActiveNwpEmployees().stream()
                .filter(e -> e.getDateOfBirth() != null)
                .map(e -> e.getDateOfBirth().plusYears(RETIREMENT_AGE_YEARS))
                .filter(retirementDate -> {
                    long monthsRemaining = java.time.temporal.ChronoUnit.MONTHS.between(
                            today,
                            retirementDate
                    );
                    return monthsRemaining >= 0 && monthsRemaining <= months;
                })
                .count();
    }

    private String resolveWorkplaceLabel(Employee employee) {
        String office = employee.getCurrentOffice();
        if (office != null && !office.isBlank()) {
            return office.trim();
        }
        String workingPlace = employee.getCurrentWorkingPlace();
        if (workingPlace != null && !workingPlace.isBlank()) {
            String trimmed = workingPlace.trim();
            int separator = trimmed.indexOf(" — ");
            if (separator >= 0) {
                String parsedOffice = trimmed.substring(separator + 3).trim();
                if (!parsedOffice.isBlank()) {
                    return parsedOffice;
                }
            }
            return trimmed;
        }
        return null;
    }

    private int severityRank(String severity) {
        if ("error".equalsIgnoreCase(severity)) {
            return 0;
        }
        if ("warning".equalsIgnoreCase(severity)) {
            return 1;
        }
        return 2;
    }

    private List<Employee> getActiveNwpEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.ACTIVE)
                .stream()
                .filter(this::isNwpEmployee)
                .toList();
    }

    private boolean isNwpEmployee(Employee employee) {
        return DepartmentConstants.isNwpEngineering(employee.getCurrentDepartment());
    }

    private boolean isNwpAction(EmployeeAction action) {
        if (DepartmentConstants.isNwpEngineering(action.getDepartment())) {
            return true;
        }
        if (DepartmentConstants.isNwpEngineering(action.getFromDepartment())) {
            return true;
        }
        if (DepartmentConstants.isNwpEngineering(action.getToDepartment())) {
            return true;
        }
        Employee employee = action.getEmployee();
        return employee != null && isNwpEmployee(employee);
    }
}
