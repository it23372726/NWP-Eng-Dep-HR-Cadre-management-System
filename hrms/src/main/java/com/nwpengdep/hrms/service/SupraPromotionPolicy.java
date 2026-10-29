package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Grade;

public final class SupraPromotionPolicy {
    private SupraPromotionPolicy() { }
    public static boolean isSupraOnly(Designation designation) {
        return designation != null && designation.getAllowedGrades() != null
                && designation.getAllowedGrades().size() == 1
                && designation.getAllowedGrades().contains(Grade.SUPRA);
    }
    public static boolean isEntryGrade(Grade grade) {
        return grade == Grade.III || grade == Grade.II || grade == Grade.I;
    }
    public static void validateExam(String examination) {
        if (examination == null || examination.isBlank())
            throw new IllegalArgumentException("Enter the examination passed for the Supra promotion.");
        if (examination.trim().length() > 255)
            throw new IllegalArgumentException("Examination passed must not exceed 255 characters.");
    }
}
