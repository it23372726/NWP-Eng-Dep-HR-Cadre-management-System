package com.nwpengdep.hrms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalaryIncrementHistoryItemDto {

    private String serviceAppointmentKey;

    private Long id;

    private UUID operationId;

    private SalaryIncrementOperationType operationType;

    private Integer dueYear;

    private LocalDate dueDate;

    private LocalDate doneDate;

    private SalaryIncrementRecordStatus status;

    private LocalDateTime recordedAt;

    private String recordedBy;

    private LocalDateTime updatedAt;

    private String updatedBy;

    private LocalDateTime reversedAt;

    private String reversedBy;

    private boolean legacyImported;
}
