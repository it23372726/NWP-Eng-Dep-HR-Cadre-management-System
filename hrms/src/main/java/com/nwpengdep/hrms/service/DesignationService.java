package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public Designation createDesignation(DesignationRequest request) {
        Designation designation = Designation.builder()
                .designationName(request.getDesignationName().trim())
                .service(resolveService(request.getServiceId()))
                .serviceLevel(
                        serviceLevelService.resolve(request.getServiceLevelId())
                )
                .allowedGrades(resolveAllowedGrades(request.getAllowedGrades()))
                .salaryCode(request.getSalaryCode())
                .build();

        return designationRepository.save(designation);
    }

    public List<Designation> getAllDesignations() {
        return designationRepository.findAll();
    }

    public Designation getById(Long id) {
        return designationRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }

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

        return designationRepository.save(designation);
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
}
