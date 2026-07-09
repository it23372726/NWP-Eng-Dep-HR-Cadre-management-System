package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.service.DesignationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/designations")
@RequiredArgsConstructor
public class DesignationController {

    private static final String ORG_OR_EMPLOYEE_READ =
            "hasAuthority('ORGANIZATION') or hasAuthority('EMPLOYEE_VIEW') or hasAuthority('EMPLOYEE_EDIT')";
    private static final String ORG_WRITE = "hasAuthority('ORGANIZATION')";

    private final DesignationService designationService;

    @PostMapping
    @PreAuthorize(ORG_WRITE)
    public Designation createDesignation(
            @Valid @RequestBody DesignationRequest request
    ) {
        return designationService.createDesignation(request);
    }

    @GetMapping
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<Designation> getAllDesignations() {
        return designationService.getAllDesignations();
    }

    @GetMapping("/by-service/{serviceId}")
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<Designation> getDesignationsByService(
            @PathVariable Long serviceId
    ) {
        return designationService.getDesignationsByService(serviceId);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public Designation updateDesignation(
            @PathVariable Long id,
            @Valid @RequestBody DesignationRequest request
    ) {
        return designationService.updateDesignation(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public void deleteDesignation(@PathVariable Long id) {
        designationService.deleteDesignation(id);
    }

    @GetMapping("/search")
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<Designation> searchDesignation(
            @RequestParam String keyword
    ) {
        return designationService.searchDesignation(keyword);
    }
}
