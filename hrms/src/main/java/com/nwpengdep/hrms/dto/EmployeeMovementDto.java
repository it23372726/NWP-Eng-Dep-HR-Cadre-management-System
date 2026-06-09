package com.nwpengdep.hrms.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeMovementDto {

    private Long id;

    private Long employeeId;

    private String employeeName;

    private String actionType;

    private LocalDate actionDate;

    private String description;

    private String oldDesignation;

    private String newDesignation;
}
