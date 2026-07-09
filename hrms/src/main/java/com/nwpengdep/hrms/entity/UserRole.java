package com.nwpengdep.hrms.entity;

public enum UserRole {
    SUPER_ADMIN,
    SUBJECT_OFF_EMP,
    SUBJECT_OFF_ORG,
    VIEW_ONLY;

    public boolean isConfigurable() {
        return this != SUPER_ADMIN;
    }
}