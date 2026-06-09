package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class NewAppointmentRequest {

    @NotNull(message = "Appointment date is required")
    private LocalDate appointmentDate;

    private String remarks;
}
