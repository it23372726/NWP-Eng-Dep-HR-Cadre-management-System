package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('DASHBOARD')")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public DashboardStatsResponse getStats() {
        return dashboardService.getDashboardStats();
    }

    @GetMapping("/summary")
    public DashboardSummaryDto getSummary() {
        return dashboardService.getDashboardSummary();
    }

    @GetMapping("/comprehensive")
    public ComprehensiveDashboardDto getComprehensive() {
        return dashboardService.getComprehensiveDashboard();
    }

    @GetMapping("/service-level-distribution")
    public List<EmployeeDistributionDto> getServiceLevelDistribution() {
        return dashboardService.getServiceLevelDistribution();
    }

    @GetMapping("/service-distribution")
    public List<EmployeeDistributionDto> getServiceDistribution() {
        return dashboardService.getServiceDistribution();
    }

    @GetMapping("/cadre-status")
    public List<CadreStatusDto> getCadreStatus() {
        return dashboardService.getCadreStatus();
    }

    @GetMapping("/district-distribution")
    public List<DistrictDistributionDto> getDistrictDistribution() {
        return dashboardService.getDistrictDistribution();
    }

    @GetMapping("/recent-movements")
    public List<EmployeeMovementDto> getRecentMovements() {
        return dashboardService.getRecentEmployeeMovements();
    }

    @GetMapping("/retirement-watch")
    public List<RetirementWatchDto> getRetirementWatch() {
        return dashboardService.getRetirementWatchList();
    }

    @GetMapping("/birthdays")
    public List<BirthdayDto> getBirthdays() {
        return dashboardService.getBirthdaysThisMonth();
    }

    @GetMapping("/recent-employees")
    public List<RecentEmployeeDto> getRecentEmployees() {
        return dashboardService.getRecentlyAddedEmployees();
    }

    @GetMapping("/alerts")
    public List<DashboardAlertDto> getAlerts() {
        return dashboardService.getDashboardAlerts();
    }
}
