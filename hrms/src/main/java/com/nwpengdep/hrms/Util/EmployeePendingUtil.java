package com.nwpengdep.hrms.util;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;

public final class EmployeePendingUtil {

    private EmployeePendingUtil() {
    }

    public static boolean isSystemPending(Employee employee, boolean hasActiveActions) {
        return employee != null
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && employee.getStatus() == EmployeeStatus.ACTIVE
                && !hasActiveActions;
    }
}
