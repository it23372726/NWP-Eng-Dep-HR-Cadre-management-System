package com.nwpengdep.hrms.security;

/** A separate identity type; employee logins never inherit staff permissions. */
public record EmployeePrincipal(Long employeeId, String employeeNo) implements java.security.Principal {
    @Override public String getName() { return "employee:" + employeeId; }
}
