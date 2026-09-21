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

    private String recordedDesignationName;

    private String specialDesignationName;

    private Boolean specialDesignationUpdated;

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

    private String district;

    private Long linkedActionId;

    private String reason;

    private String remarks;

    private String serviceAppointmentKey;
    private Long serviceId;
    private Long serviceLevelId;
    private String oldServiceCode;
    private String newServiceCode;
    private String appointmentBasis;
    private String incrementDate;
    private LocalDate firstIncrementDueDate;

    private LocalDateTime createdAt;

    /** @deprecated Prefer canEdit; kept for older clients. Same meaning as canEdit. */
    private Boolean canModify;

    /** Any non-auto event may be edited (full-timeline validation applies). */
    private Boolean canEdit;

    /** Only the latest modifiable event may be deleted. */
    private Boolean canDelete;

    private Boolean autoCreated;

    private Boolean trainingGraduation;

    private Boolean trainingAppointment;
}
