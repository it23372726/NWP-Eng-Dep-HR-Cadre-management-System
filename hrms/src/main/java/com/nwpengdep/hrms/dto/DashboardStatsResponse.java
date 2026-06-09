package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardStatsResponse {

    private long totalEmployees;

    private long totalDesignations;

    private long currentPostings;
}