package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsUpdateRequest;
import com.nwpengdep.hrms.service.OrganizationSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organization-settings")
@RequiredArgsConstructor
public class OrganizationSettingsController {

    private final OrganizationSettingsService organizationSettingsService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public OrganizationSettingsResponse getSettings() {
        return organizationSettingsService.getSettings();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ORGANIZATION')")
    public OrganizationSettingsResponse updateSettings(
            @Valid @RequestBody OrganizationSettingsUpdateRequest request
    ) {
        return organizationSettingsService.updateSettings(request);
    }
}
