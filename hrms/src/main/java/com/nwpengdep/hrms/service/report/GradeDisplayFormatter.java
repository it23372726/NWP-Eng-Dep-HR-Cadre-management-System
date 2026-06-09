package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.entity.Grade;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class GradeDisplayFormatter {

    private static final List<Grade> DISPLAY_ORDER = List.of(
            Grade.III,
            Grade.II,
            Grade.I,
            Grade.SUPRA,
            Grade.SPECIAL
    );

    private GradeDisplayFormatter() {
    }

    public static String format(Set<Grade> grades) {
        if (grades == null || grades.isEmpty()) {
            return "—";
        }

        return DISPLAY_ORDER.stream()
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
