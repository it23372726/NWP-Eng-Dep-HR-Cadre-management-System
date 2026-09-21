package com.nwpengdep.hrms.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ServiceAppointmentRequest {
    private String expectedHistoryRevision;
    @NotNull private Long newDesignationId;
    @NotNull private Long serviceLevelId;
    @NotNull @PastOrPresent private LocalDate appointmentDate;
    /** The examination or other basis stated in the appointment letter. */
    @NotBlank @Size(max = 255) private String appointmentBasis;
    @NotBlank @Pattern(regexp = "\\d{2}-\\d{2}") private String incrementDate;
    @NotNull private LocalDate firstIncrementDueDate;
    @NotBlank private String department;
    @NotBlank private String office;
    private String district;
    private String remarks;
    /** Stable client operation key, also retained by lifecycle-history revisions. */
    @NotBlank @Pattern(regexp = "[0-9a-fA-F-]{36}") private String serviceAppointmentKey;
}
