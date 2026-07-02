package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceGrade1Requirement;
import com.nwpengdep.hrms.entity.ServiceGrade2Requirement;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceSpecialRequirement;
import com.nwpengdep.hrms.entity.ServiceSupraRequirement;
import com.nwpengdep.hrms.entity.ServiceType;
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
public class ServiceTypeService {

    private final ServiceTypeRepository serviceTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;

    @Transactional
    public ServiceType createService(ServiceTypeRequest request) {
        ServiceType service = ServiceType.builder()
                .serviceCode(request.getServiceCode().trim())
                .description(request.getDescription().trim())
                .allowedGrades(resolveAllowedGrades(request.getAllowedGrades()))
                .grade2RequiredYears(request.getGrade2RequiredYears())
                .grade1RequiredYears(request.getGrade1RequiredYears())
                .supraRequiredYears(request.getSupraRequiredYears())
                .specialRequiredYears(request.getSpecialRequiredYears())
                .build();
        applyRequirementRules(service, request);

        return serviceTypeRepository.save(service);
    }

    public List<ServiceType> getAllServices() {
        return serviceTypeRepository.findAll();
    }

    public ServiceType getServiceById(Long id) {
        return serviceTypeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Service not found"));
    }

    @Transactional
    public ServiceType updateService(Long id, ServiceTypeRequest request) {
        ServiceType service = serviceTypeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Service not found"));

        service.setServiceCode(request.getServiceCode().trim());
        service.setDescription(request.getDescription().trim());
        service.setAllowedGrades(resolveAllowedGrades(request.getAllowedGrades()));
        service.setGrade2RequiredYears(request.getGrade2RequiredYears());
        service.setGrade1RequiredYears(request.getGrade1RequiredYears());
        service.setSupraRequiredYears(request.getSupraRequiredYears());
        service.setSpecialRequiredYears(request.getSpecialRequiredYears());
        applyRequirementRules(service, request);

        ServiceType savedService = serviceTypeRepository.save(service);
        recalculateEmployeesForService(savedService.getId());
        return savedService;
    }

    public void deleteService(Long id) {
        serviceTypeRepository.deleteById(id);
    }

    public List<ServiceType> searchServices(String keyword) {
        return serviceTypeRepository
                .findByServiceCodeContainingIgnoreCase(keyword);
    }

    public void validateDesignationGradesSubsetOfService(
            Set<Grade> designationGrades,
            ServiceType service
    ) {
        if (service == null) {
            throw new RuntimeException("Service is required");
        }

        Set<Grade> serviceGrades = service.getAllowedGrades();
        if (serviceGrades == null || serviceGrades.isEmpty()) {
            throw new RuntimeException(
                    "Service '"
                            + service.getServiceCode()
                            + "' has no maximum achievable grades configured"
            );
        }

        if (designationGrades == null || designationGrades.isEmpty()) {
            throw new RuntimeException(
                    "At least one eligible grade is required for the designation"
            );
        }

        Set<Grade> invalidGrades = new HashSet<>(designationGrades);
        invalidGrades.removeAll(serviceGrades);
        if (!invalidGrades.isEmpty()) {
            throw new RuntimeException(
                    "Designation eligible grades must be within the service maximum: "
                            + invalidGrades.stream()
                                    .map(Grade::getLabel)
                                    .sorted()
                                    .toList()
            );
        }
    }

    private Set<Grade> resolveAllowedGrades(Set<Grade> allowedGrades) {
        if (allowedGrades == null || allowedGrades.isEmpty()) {
            throw new RuntimeException(
                    "At least one allowed grade is required"
            );
        }

        boolean hasSupra = allowedGrades.contains(Grade.SUPRA);
        boolean hasSpecial = allowedGrades.contains(Grade.SPECIAL);
        if (hasSupra && hasSpecial) {
            throw new RuntimeException(
                    "A service cannot allow both Supra and Special as maximum grades. "
                            + "Choose one terminal promotion path."
            );
        }

        return new HashSet<>(EnumSet.copyOf(allowedGrades));
    }

    private void applyRequirementRules(
            ServiceType service,
            ServiceTypeRequest request
    ) {
        service.getPermanentRequirements().clear();
        toRequirementNames(request.getCustomPermanentRequirements())
                .forEach(name -> {
                    ServicePermanentRequirement requirement =
                            new ServicePermanentRequirement();
                    requirement.setService(service);
                    requirement.setRequirementName(name);
                    service.getPermanentRequirements().add(requirement);
                });

        service.getGrade2Requirements().clear();
        toRequirementNames(request.getCustomGrade2Requirements())
                .forEach(name -> {
                    ServiceGrade2Requirement requirement =
                            new ServiceGrade2Requirement();
                    requirement.setService(service);
                    requirement.setRequirementName(name);
                    service.getGrade2Requirements().add(requirement);
                });

        service.getGrade1Requirements().clear();
        toRequirementNames(request.getCustomGrade1Requirements())
                .forEach(name -> {
                    ServiceGrade1Requirement requirement =
                            new ServiceGrade1Requirement();
                    requirement.setService(service);
                    requirement.setRequirementName(name);
                    service.getGrade1Requirements().add(requirement);
                });

        service.getSupraRequirements().clear();
        toRequirementNames(request.getCustomSupraRequirements())
                .forEach(name -> {
                    ServiceSupraRequirement requirement =
                            new ServiceSupraRequirement();
                    requirement.setService(service);
                    requirement.setRequirementName(name);
                    service.getSupraRequirements().add(requirement);
                });

        service.getSpecialRequirements().clear();
        toRequirementNames(request.getCustomSpecialRequirements())
                .forEach(name -> {
                    ServiceSpecialRequirement requirement =
                            new ServiceSpecialRequirement();
                    requirement.setService(service);
                    requirement.setRequirementName(name);
                    service.getSpecialRequirements().add(requirement);
                });

        if (service.getAllowedGrades().contains(Grade.SUPRA)) {
            service.setSpecialRequiredYears(null);
            service.getSpecialRequirements().clear();
        } else if (service.getAllowedGrades().contains(Grade.SPECIAL)) {
            service.setSupraRequiredYears(null);
            service.getSupraRequirements().clear();
        } else {
            service.setSupraRequiredYears(null);
            service.setSpecialRequiredYears(null);
            service.getSupraRequirements().clear();
            service.getSpecialRequirements().clear();
        }
    }

    private void recalculateEmployeesForService(Long serviceId) {
        List<Employee> employees =
                employeeRepository.findByDesignation_ServiceId(serviceId);

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
