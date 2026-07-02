package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.entity.Grade;

import java.util.Set;
import java.util.stream.Collectors;

public final class GradeDisplayFormatter {

    private GradeDisplayFormatter() {
    }

    public static String format(Set<Grade> grades) {
        if (grades == null || grades.isEmpty()) {
            return "—";
        }

        return ReportSortOrder.GRADE_ORDER.stream()
                .filter(grades::contains)
                .map(grade -> {
                    if (grade == Grade.SPECIAL) {
                        return "Spl";
                    }
                    return grade.getLabel();
                })
                .collect(Collectors.joining("/"));
    }
}
