package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.EmployeeActionType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeActionResponse {

    private Long id;

    private EmployeeActionType actionType;

    private LocalDate actionDate;

    private String oldDesignationName;

    private Long oldDesignationId;

    private String newDesignationName;

    private Long newDesignationId;

    private String transferredFrom;

    private String transferredTo;

    private String reason;

    private String remarks;

    private LocalDateTime createdAt;
}
