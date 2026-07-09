package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.service.ServiceTypeService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceTypeController {

    private static final String ORG_OR_EMPLOYEE_READ =
            "hasAuthority('ORGANIZATION') or hasAuthority('EMPLOYEE_VIEW') or hasAuthority('EMPLOYEE_EDIT')";
    private static final String ORG_WRITE = "hasAuthority('ORGANIZATION')";

    private final ServiceTypeService serviceTypeService;

    @PostMapping
    @PreAuthorize(ORG_WRITE)
    public ServiceType createService(
            @Valid @RequestBody ServiceTypeRequest request
    ) {
        return serviceTypeService.createService(request);
    }

    @GetMapping
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<ServiceType> getAllServices() {
        return serviceTypeService.getAllServices();
    }

    @GetMapping("/{id}")
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public ServiceType getServiceById(@PathVariable Long id) {
        return serviceTypeService.getServiceById(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public ServiceType updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceTypeRequest request
    ) {
        return serviceTypeService.updateService(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public void deleteService(@PathVariable Long id) {
        serviceTypeService.deleteService(id);
    }

    @GetMapping("/search")
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<ServiceType> searchServices(
            @RequestParam String keyword
    ) {
        return serviceTypeService.searchServices(keyword);
    }
}
