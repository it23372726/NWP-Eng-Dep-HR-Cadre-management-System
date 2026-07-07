package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;
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

    private String recordedDesignationName;

    private String specialDesignationName;

    private Long newDesignationId;

    private String oldGrade;

    private String newGrade;

    private String transferredFrom;

    private String transferredTo;

    private String department;

    private String office;

    private String fromDepartment;

    private String fromOffice;

    private String toDepartment;

    private String toOffice;

    private District district;

    private Long linkedActionId;

    private String reason;

    private String remarks;

    private LocalDateTime createdAt;

    private Boolean canModify;

    private Boolean autoCreated;

    private Boolean trainingGraduation;

    private Boolean trainingAppointment;
}
