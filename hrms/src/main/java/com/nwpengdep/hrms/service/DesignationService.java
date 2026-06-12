package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.DesignationGrade1Requirement;
import com.nwpengdep.hrms.entity.DesignationGrade2Requirement;
import com.nwpengdep.hrms.entity.DesignationPermanentRequirement;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DesignationService {

    private final DesignationRepository designationRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final ServiceLevelService serviceLevelService;
    private final EmployeeRepository employeeRepository;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;

    public Designation createDesignation(DesignationRequest request) {
        Designation designation = Designation.builder()
                .designationName(request.getDesignationName().trim())
                .service(resolveService(request.getServiceId()))
                .serviceLevel(
                        serviceLevelService.resolve(request.getServiceLevelId())
                )
                .allowedGrades(resolveAllowedGrades(request.getAllowedGrades()))
                .salaryCode(request.getSalaryCode())
                .grade2RequiredYears(request.getGrade2RequiredYears())
                .grade1RequiredYears(request.getGrade1RequiredYears())
                .build();
        applyRequirementRules(designation, request);

        return designationRepository.save(designation);
    }

    public List<Designation> getAllDesignations() {
        return designationRepository.findAll();
    }

    public List<Designation> getDesignationsByService(Long serviceId) {
        if (!serviceTypeRepository.existsById(serviceId)) {
            throw new RuntimeException("Service not found");
        }

        return designationRepository.findByServiceId(serviceId);
    }

    public Designation getById(Long id) {
        return designationRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }

    @Transactional
    public Designation updateDesignation(
            Long id,
            DesignationRequest request
    ) {
        Designation designation = getById(id);

        designation.setDesignationName(request.getDesignationName().trim());
        designation.setService(resolveService(request.getServiceId()));
        designation.setServiceLevel(
                serviceLevelService.resolve(request.getServiceLevelId())
        );
        designation.setAllowedGrades(
                resolveAllowedGrades(request.getAllowedGrades())
        );
        designation.setSalaryCode(request.getSalaryCode());
        designation.setGrade2RequiredYears(request.getGrade2RequiredYears());
        designation.setGrade1RequiredYears(request.getGrade1RequiredYears());
        applyRequirementRules(designation, request);

        Designation savedDesignation = designationRepository.save(designation);
        recalculateEmployeesForDesignation(savedDesignation);
        return savedDesignation;
    }

    public void deleteDesignation(Long id) {
        designationRepository.deleteById(id);
    }

    public List<Designation> searchDesignation(String keyword) {
        return designationRepository
                .findByDesignationNameContainingIgnoreCase(keyword);
    }

    private ServiceType resolveService(Long serviceId) {
        return serviceTypeRepository.findById(serviceId)
                .orElseThrow(() ->
                        new RuntimeException("Service not found"));
    }

    private Set<Grade> resolveAllowedGrades(Set<Grade> allowedGrades) {
        if (allowedGrades == null || allowedGrades.isEmpty()) {
            throw new RuntimeException(
                    "At least one allowed grade is required"
            );
        }

        return new HashSet<>(EnumSet.copyOf(allowedGrades));
    }

    private void applyRequirementRules(
            Designation designation,
            DesignationRequest request
    ) {
        designation.getPermanentRequirements().clear();
        toRequirementNames(request.getCustomPermanentRequirements())
                .forEach(name -> {
                    DesignationPermanentRequirement requirement =
                            new DesignationPermanentRequirement();
                    requirement.setDesignation(designation);
                    requirement.setRequirementName(name);
                    designation.getPermanentRequirements().add(requirement);
                });

        designation.getGrade2Requirements().clear();
        toRequirementNames(request.getCustomGrade2Requirements())
                .forEach(name -> {
                    DesignationGrade2Requirement requirement =
                            new DesignationGrade2Requirement();
                    requirement.setDesignation(designation);
                    requirement.setRequirementName(name);
                    designation.getGrade2Requirements().add(requirement);
                });

        designation.getGrade1Requirements().clear();
        toRequirementNames(request.getCustomGrade1Requirements())
                .forEach(name -> {
                    DesignationGrade1Requirement requirement =
                            new DesignationGrade1Requirement();
                    requirement.setDesignation(designation);
                    requirement.setRequirementName(name);
                    designation.getGrade1Requirements().add(requirement);
                });
    }

    private void recalculateEmployeesForDesignation(Designation designation) {
        List<Employee> employees =
                employeeRepository.findByDesignationId(designation.getId());

        for (Employee employee : employees) {
            requirementSyncService.syncEmployeeRequirements(employee);
            careerProgressionService.recalculateEmployeeCareer(employee);
            employeeRepository.save(employee);
        }
    }

    private List<String> toRequirementNames(List<String> requirements) {
        if (requirements == null) {
            return List.of();
        }

        return requirements.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }
}
