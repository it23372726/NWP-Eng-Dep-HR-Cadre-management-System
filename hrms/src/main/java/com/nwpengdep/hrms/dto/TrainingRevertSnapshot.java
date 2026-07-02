package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.Grade;

import java.time.LocalDate;

public record TrainingRevertSnapshot(
        Long graduationActionId,
        Long serviceLevelId,
        Grade grade,
        LocalDate dateOfFirstAppointment,
        LocalDate appointmentDateToPresentClassGrade
) {
}
