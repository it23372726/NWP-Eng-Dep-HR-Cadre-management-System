package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.CadrePositionRequest;
import com.nwpengdep.hrms.dto.VacancyReportResponse;
import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.entity.CadrePosition;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.service.report.ReportSortOrder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CadrePositionService {

    private final CadrePositionRepository cadreRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;

    public CadrePosition createCadre(CadrePositionRequest request) {
        Designation designation = resolveDesignation(request.getDesignationId());

        if (cadreRepository.existsByDesignationId(request.getDesignationId())) {
            throw new RuntimeException(
                    "Cadre already exists for this designation"
            );
        }

        CadrePosition cadre = CadrePosition.builder()
                .designation(designation)
                .approvedCount(request.getApprovedCount())
                .displayOrder(nextDisplayOrder())
                .build();

        return cadreRepository.save(cadre);
    }

    public CadrePosition updateCadre(Long id, CadrePositionRequest request) {
        CadrePosition cadre = cadreRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Cadre not found"));

        if (cadreRepository.existsByDesignationIdAndIdNot(
                request.getDesignationId(),
                id
        )) {
            throw new RuntimeException(
                    "Cadre already exists for this designation"
            );
        }

        cadre.setDesignation(resolveDesignation(request.getDesignationId()));
        cadre.setApprovedCount(request.getApprovedCount());

        return cadreRepository.save(cadre);
    }

    public List<CadrePosition> getAllCadres() {
        List<CadrePosition> cadres = new ArrayList<>(cadreRepository.findAll());
        sortCadresForDisplay(cadres);
        return cadres;
    }

    public List<Designation> getDesignationsInDisplayOrder() {
        List<CadrePosition> cadres = new ArrayList<>(cadreRepository.findAll());
        sortCadresForDisplay(cadres);

        Set<Long> cadreDesignationIds = new HashSet<>();
        List<Designation> orderedDesignations = new ArrayList<>();

        for (CadrePosition cadre : cadres) {
            Designation designation = cadre.getDesignation();
            orderedDesignations.add(designation);
            cadreDesignationIds.add(designation.getId());
        }

        List<Designation> remainingDesignations = designationRepository.findAll()
                .stream()
                .filter(designation -> !cadreDesignationIds.contains(designation.getId()))
                .collect(Collectors.toCollection(ArrayList::new));
        remainingDesignations.sort(ReportSortOrder.designationComparator());
        orderedDesignations.addAll(remainingDesignations);

        return orderedDesignations;
    }

    @Transactional
    public void reorderCadres(List<Long> orderedCadreIds) {
        List<CadrePosition> cadres = cadreRepository.findAll();
        Set<Long> existingIds = cadres.stream()
                .map(CadrePosition::getId)
                .collect(Collectors.toSet());
        Set<Long> providedIds = new HashSet<>(orderedCadreIds);

        if (!existingIds.equals(providedIds)) {
            throw new RuntimeException(
                    "Ordered list must include every cadre position exactly once"
            );
        }

        Map<Long, CadrePosition> cadresById = cadres.stream()
                .collect(Collectors.toMap(CadrePosition::getId, cadre -> cadre));

        for (int index = 0; index < orderedCadreIds.size(); index++) {
            CadrePosition cadre = cadresById.get(orderedCadreIds.get(index));
            if (cadre == null) {
                throw new RuntimeException("Cadre not found");
            }
            cadre.setDisplayOrder(index + 1);
        }

        cadreRepository.saveAll(cadres);
    }

    public void deleteCadre(Long id) {
        cadreRepository.deleteById(id);
    }

    public List<VacancyReportResponse> getVacancyReport() {
        List<CadrePosition> cadres = new ArrayList<>(cadreRepository.findAll());
        sortCadresForDisplay(cadres);
        List<VacancyReportResponse> report = new ArrayList<>();

        long totalApproved = 0;
        long totalCurrent = 0;
        long totalVacancy = 0;
        long totalExcess = 0;

        for (CadrePosition cadre : cadres) {
            Designation designation = cadre.getDesignation();
            long currentCount = employeeRepository
                    .countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                            designation.getId(),
                            EmployeeStatus.ACTIVE,
                            DepartmentConstants.NWP_ENGINEERING
                    );
            long approved = cadre.getApprovedCount() != null
                    ? cadre.getApprovedCount().longValue()
                    : 0L;
            long vacancy = Math.max(0, approved - currentCount);
            long excess = Math.max(0, currentCount - approved);

            totalApproved += approved;
            totalCurrent += currentCount;
            totalVacancy += vacancy;
            totalExcess += excess;

            report.add(
                    VacancyReportResponse.builder()
                            .designationName(designation.getDesignationName())
                            .serviceCode(
                                    designation.getService() != null
                                            ? designation.getService()
                                                    .getServiceCode()
                                            : null
                            )
                            .serviceLevelName(
                                    designation.getServiceLevel() != null
                                            ? designation.getServiceLevel()
                                                    .getLevelName()
                                            : null
                            )
                            .approvedCount(cadre.getApprovedCount())
                            .currentCount(currentCount)
                            .vacancyCount(vacancy)
                            .excessCount(excess)
                            .totalsRow(false)
                            .build()
            );
        }

        report.add(
                VacancyReportResponse.builder()
                        .designationName("TOTAL")
                        .serviceCode("")
                        .serviceLevelName("")
                        .approvedCount((int) totalApproved)
                        .currentCount(totalCurrent)
                        .vacancyCount(totalVacancy)
                        .excessCount(totalExcess)
                        .totalsRow(true)
                        .build()
        );

        return report;
    }

    public void sortCadresForDisplay(List<CadrePosition> cadres) {
        cadres.sort(Comparator
                .comparing(
                        CadrePosition::getDisplayOrder,
                        Comparator.nullsLast(Integer::compareTo)
                )
                .thenComparing(
                        CadrePosition::getDesignation,
                        ReportSortOrder.designationComparator()
                ));
    }

    private int nextDisplayOrder() {
        return cadreRepository.findAll()
                .stream()
                .map(CadrePosition::getDisplayOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
