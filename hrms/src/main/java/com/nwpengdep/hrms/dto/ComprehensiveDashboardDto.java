package com.nwpengdep.hrms.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComprehensiveDashboardDto {

    private DashboardSummaryDto summary;

    private List<EmployeeDistributionDto> serviceLevelDistribution;

    private List<EmployeeDistributionDto> serviceDistribution;

    private List<EmployeeDistributionDto> designationDistribution;

    private List<EmployeeDistributionDto> gradeDistribution;

    private List<EmployeeDistributionDto> permanentStatusDistribution;

    private List<DistrictWorkplaceDistributionDto> workplaceDistributionByDistrict;

    private RetirementForecastDto retirementForecast;

    private List<CadreStatusDto> cadreStatus;

    private List<DistrictDistributionDto> districtDistribution;

    private List<EmployeeMovementDto> recentMovements;

    private List<RetirementWatchDto> retirementWatchList;

    private List<BirthdayDto> birthdaysThisMonth;

    private List<RecentEmployeeDto> recentlyAddedEmployees;

    private List<SalaryIncrementWatchDto> pendingSalaryIncrements;

    private List<SalaryIncrementWatchDto> upcomingSalaryIncrements;

    private List<DashboardAlertDto> alerts;
}
