package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkplaceHistoryRowDto {

    private LocalDate fromDate;

    private LocalDate toDate;

    private String toDateLabel;

    private String workingPlace;
}
