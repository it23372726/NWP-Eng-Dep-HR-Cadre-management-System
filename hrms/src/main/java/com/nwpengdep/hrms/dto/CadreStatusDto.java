package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CadreStatusDto {

    private String designation;

    private Long approved;

    private Long existing;

    private Long vacancy;

    private String vacancyStatus;
}
