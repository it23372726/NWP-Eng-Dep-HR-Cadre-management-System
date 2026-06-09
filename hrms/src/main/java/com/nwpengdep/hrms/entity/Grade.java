package com.nwpengdep.hrms.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Grade {
    NONE("None"),
    I("I"),
    II("II"),
    III("III"),
    SUPRA("Supra"),
    SPECIAL("Special");

    private final String label;

    Grade(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static Grade fromLabel(String label) {
        for (Grade grade : values()) {
            if (grade.label.equalsIgnoreCase(label)) {
                return grade;
            }
        }
        throw new IllegalArgumentException("Invalid grade: " + label);
    }
}
