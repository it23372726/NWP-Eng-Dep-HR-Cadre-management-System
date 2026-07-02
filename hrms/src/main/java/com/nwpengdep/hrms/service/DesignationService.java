package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private final ServiceTypeService serviceTypeService;
    private final EmployeeRepository employeeRepository;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;

    public Designation createDesignation(DesignationRequest request) {
        ServiceType service = resolveService(request.getServiceId());
        Set<Grade> allowedGrades = resolveAllowedGrades(request.getAllowedGrades());
        serviceTypeService.validateDesignationGradesSubsetOfService(
                allowedGrades,
                service
        );

        Designation designation = Designation.builder()
                .designationName(request.getDesignationName().trim())
                .service(service)
                .serviceLevel(
                        serviceLevelService.resolve(request.getServiceLevelId())
                )
                .allowedGrades(allowedGrades)
                .salaryCode(request.getSalaryCode())
                .createdAt(LocalDateTime.now())
                .build();

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
        ServiceType service = resolveService(request.getServiceId());
        Set<Grade> allowedGrades = resolveAllowedGrades(request.getAllowedGrades());
        serviceTypeService.validateDesignationGradesSubsetOfService(
                allowedGrades,
                service
        );

        designation.setDesignationName(request.getDesignationName().trim());
        designation.setService(service);
        designation.setServiceLevel(
                serviceLevelService.resolve(request.getServiceLevelId())
        );
        designation.setAllowedGrades(allowedGrades);
        designation.setSalaryCode(request.getSalaryCode());

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

    private void recalculateEmployeesForDesignation(Designation designation) {
        List<Employee> employees =
                employeeRepository.findByDesignationId(designation.getId());

        for (Employee employee : employees) {
            requirementSyncService.syncEmployeeRequirements(employee);
            careerProgressionService.recalculateEmployeeCareer(employee);
            employeeRepository.save(employee);
        }
    }
}
