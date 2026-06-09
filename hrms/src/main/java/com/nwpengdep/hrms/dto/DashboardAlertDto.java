package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardAlertDto {

    private String type;

    private String message;

    private String severity;

    private Long count;
}
