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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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
        return cadreRepository.findAll();
    }

    public void deleteCadre(Long id) {
        cadreRepository.deleteById(id);
    }

    public List<VacancyReportResponse> getVacancyReport() {
        List<CadrePosition> cadres = cadreRepository.findAll();
        List<VacancyReportResponse> report = new ArrayList<>();

        long totalApproved = 0;
        long totalCurrent = 0;
        long totalVacancy = 0;
        long totalExcess = 0;

        for (CadrePosition cadre : cadres) {
            Designation designation = cadre.getDesignation();
            long currentCount = employeeRepository.countByDesignationIdAndStatusAndCurrentDepartment(
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

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
