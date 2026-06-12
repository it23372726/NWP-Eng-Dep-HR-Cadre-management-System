package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.service.DesignationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/designations")
@RequiredArgsConstructor
public class DesignationController {

    private final DesignationService
            designationService;

    @PostMapping
    public Designation createDesignation(
            @Valid @RequestBody
            DesignationRequest request
    ) {

        return designationService
                .createDesignation(request);
    }

    @GetMapping
    public List<Designation>
    getAllDesignations() {

        return designationService
                .getAllDesignations();
    }

    @GetMapping("/by-service/{serviceId}")
    public List<Designation> getDesignationsByService(
            @PathVariable Long serviceId
    ) {

        return designationService
                .getDesignationsByService(serviceId);
    }

    @PutMapping("/{id}")
    public Designation updateDesignation(
            @PathVariable Long id,
            @Valid @RequestBody
            DesignationRequest request
    ) {

        return designationService
                .updateDesignation(
                        id,
                        request
                );
    }

    @DeleteMapping("/{id}")
    public void deleteDesignation(
            @PathVariable Long id
    ) {

        designationService
                .deleteDesignation(id);
    }

    @GetMapping("/search")
    public List<Designation>
    searchDesignation(
            @RequestParam String keyword
    ) {

        return designationService
                .searchDesignation(keyword);
    }
}