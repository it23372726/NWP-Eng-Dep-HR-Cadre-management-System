package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangesReportResponse {

    private Integer year;

    private Integer month;

    private String monthLabel;

    private LocalDateTime generatedAt;

    private List<ChangesReportRowResponse> rows;

    private Integer totalCount;
}
