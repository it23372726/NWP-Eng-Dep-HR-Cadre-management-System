package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class NewAppointmentRequest {

    @NotNull(message = "Appointment date is required")
    private LocalDate appointmentDate;

    @NotBlank(message = "Department is required")
    private String department;

    @NotBlank(message = "Office is required")
    private String office;

    private District district;

    private String remarks;
}
