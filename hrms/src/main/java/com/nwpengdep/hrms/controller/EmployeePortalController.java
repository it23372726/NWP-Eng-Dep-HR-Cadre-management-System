package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.AuthResponse;
import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.LoginRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.security.EmployeePrincipal;
import com.nwpengdep.hrms.service.EmployeeLoginRateLimiter;
import com.nwpengdep.hrms.service.EmployeePortalService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class EmployeePortalController {
    private final EmployeePortalService portal;
    private final EmployeeLoginRateLimiter limiter;
    private final com.nwpengdep.hrms.service.report.EmployeeSummaryReportExportService summaryExport;
    private final com.nwpengdep.hrms.service.report.EmployeeDependentDetailsReportExportService dependentExport;

    @GetMapping("/api/employee-portal/export/summary-pdf")
    public ResponseEntity<byte[]> summary(@AuthenticationPrincipal EmployeePrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF).body(summaryExport.exportPdf(principal.employeeId()));
    }

    @GetMapping("/api/employee-portal/export/dependent-details-pdf")
    public ResponseEntity<byte[]> dependents(@AuthenticationPrincipal EmployeePrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF).body(dependentExport.exportPdf(principal.employeeId()));
    }

    private final com.nwpengdep.hrms.service.EmployeePhotoService photos;
    private final com.nwpengdep.hrms.service.VehiclePermitService vehiclePermits;
    private final com.nwpengdep.hrms.service.SalaryIncrementService salaryIncrements;

    @GetMapping("/api/employee-portal/photo")
    public ResponseEntity<org.springframework.core.io.Resource> photo(@AuthenticationPrincipal EmployeePrincipal principal) {
        return photos.getPhotoResource(principal.employeeId())
                .map(photo -> ResponseEntity.ok().header("Cache-Control", "no-store")
                        .contentType(org.springframework.http.MediaType.parseMediaType(photo.contentType())).body(photo.resource()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/api/employee-portal/vehicle-permit")
    public ResponseEntity<com.nwpengdep.hrms.dto.VehiclePermitStatusDto> vehiclePermit(@AuthenticationPrincipal EmployeePrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(vehiclePermits.getStatus(principal.employeeId()));
    }

    @GetMapping("/api/employee-portal/salary-increment")
    public ResponseEntity<com.nwpengdep.hrms.dto.SalaryIncrementStatusDto> salaryIncrement(
            @AuthenticationPrincipal EmployeePrincipal principal,
            @RequestParam(required = false) String serviceAppointmentKey) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(salaryIncrements.getStatus(principal.employeeId(), serviceAppointmentKey));
    }


    @PostMapping("/api/auth/employee-login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String number = request.getUsername() == null ? "" : request.getUsername().trim();
        if (number.length() > 255 || request.getPassword() == null || request.getPassword().length() > 128) {
            return ResponseEntity.status(401).body("The S/N number or NIC is incorrect.");
        }
        if (!limiter.allow(number, servletRequest.getRemoteAddr())) {
            return ResponseEntity.status(429).header("Retry-After", "900")
                    .body("Too many sign-in attempts. Please try again in 15 minutes.");
        }
        try { return ResponseEntity.ok().header("Cache-Control", "no-store").body(portal.login(request)); }
        catch (BadCredentialsException e) { return ResponseEntity.status(401).body("The S/N number or NIC is incorrect."); }
    }

    @GetMapping("/api/employee-portal/profile")
    public ResponseEntity<Employee> profile(@AuthenticationPrincipal EmployeePrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(portal.profile(principal));
    }

    @GetMapping("/api/employee-portal/history")
    public ResponseEntity<List<EmployeeActionResponse>> history(@AuthenticationPrincipal EmployeePrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(portal.history(principal));
    }
}
