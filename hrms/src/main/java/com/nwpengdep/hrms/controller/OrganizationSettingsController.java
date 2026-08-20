package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.OrganizationBrandingResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsUpdateRequest;
import com.nwpengdep.hrms.service.OrganizationLogoService;
import com.nwpengdep.hrms.service.OrganizationSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/organization-settings")
@RequiredArgsConstructor
public class OrganizationSettingsController {

    private final OrganizationSettingsService organizationSettingsService;
    private final OrganizationLogoService organizationLogoService;

    @GetMapping("/branding")
    @PreAuthorize("permitAll()")
    public OrganizationBrandingResponse getBranding() {
        return organizationSettingsService.getBranding();
    }

    @GetMapping("/logo")
    @PreAuthorize("permitAll()")
    public ResponseEntity<org.springframework.core.io.Resource> getLogo() {
        return organizationLogoService.getLogoResource()
                .map(logo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(logo.contentType()))
                        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                        .header(
                                HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=\"organization-logo\""
                        )
                        .body(logo.resource()))
                .orElse(ResponseEntity.notFound().build());
    }

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

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ORGANIZATION') or hasAuthority('SUPER_ADMIN')")
    public OrganizationSettingsResponse uploadLogo(
            @RequestParam("file") MultipartFile file
    ) {
        organizationLogoService.uploadLogo(file);
        return organizationSettingsService.getSettings();
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasAuthority('ORGANIZATION') or hasAuthority('SUPER_ADMIN')")
    public OrganizationSettingsResponse deleteLogo() {
        organizationLogoService.deleteLogo();
        return organizationSettingsService.getSettings();
    }
}
