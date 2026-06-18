package com.nwpengdep.hrms.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum District {
    KURUNEGALA("Kurunegala"),
    PUTTALAM("Puttalam");

    private final String label;

    District(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static District fromLabel(String label) {
        if (label == null || label.isBlank()) {
            return null;
        }

        for (District district : values()) {
            if (district.label.equalsIgnoreCase(label.trim())
                    || district.name().equalsIgnoreCase(label.trim())) {
                return district;
            }
        }
        throw new IllegalArgumentException("Invalid district: " + label);
    }
}
