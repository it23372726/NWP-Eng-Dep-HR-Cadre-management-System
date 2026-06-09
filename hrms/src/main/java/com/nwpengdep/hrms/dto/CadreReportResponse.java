package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CadreReportResponse {

    private LocalDate startDate;

    private LocalDate endDate;

    private LocalDateTime generatedAt;

    private List<CadreReportRowResponse> rows;

    private CadreReportRowResponse totals;
}
