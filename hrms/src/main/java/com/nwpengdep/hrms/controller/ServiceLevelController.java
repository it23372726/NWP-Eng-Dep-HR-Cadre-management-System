package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.ServiceLevelRequest;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.service.ServiceLevelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-levels")
@RequiredArgsConstructor
public class ServiceLevelController {

    private static final String ORG_OR_EMPLOYEE_READ =
            "hasAuthority('ORGANIZATION') or hasAuthority('EMPLOYEE_VIEW') or hasAuthority('EMPLOYEE_EDIT')";
    private static final String ORG_WRITE = "hasAuthority('ORGANIZATION')";

    private final ServiceLevelService serviceLevelService;

    @PostMapping
    @PreAuthorize(ORG_WRITE)
    public ServiceLevel create(@Valid @RequestBody ServiceLevelRequest request) {
        return serviceLevelService.create(request);
    }

    @GetMapping
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public List<ServiceLevel> getAll() {
        return serviceLevelService.getAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize(ORG_OR_EMPLOYEE_READ)
    public ServiceLevel getById(@PathVariable Long id) {
        return serviceLevelService.getById(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public ServiceLevel update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceLevelRequest request
    ) {
        return serviceLevelService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(ORG_WRITE)
    public void delete(@PathVariable Long id) {
        serviceLevelService.delete(id);
    }
}
