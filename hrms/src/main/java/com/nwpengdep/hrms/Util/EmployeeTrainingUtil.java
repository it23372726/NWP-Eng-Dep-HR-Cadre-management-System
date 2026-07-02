package com.nwpengdep.hrms.util;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.ServiceLevel;

public final class EmployeeTrainingUtil {

    public static final String TRAINING_LEVEL_NAME = "Training";

    private EmployeeTrainingUtil() {
    }

    public static boolean isTrainingEmployee(Employee employee) {
        if (employee == null || employee.getEmploymentType() != null) {
            return false;
        }

        ServiceLevel serviceLevel = employee.getServiceLevel();
        return serviceLevel != null
                && TRAINING_LEVEL_NAME.equalsIgnoreCase(serviceLevel.getLevelName());
    }

    public static boolean isTrainingServiceLevel(ServiceLevel serviceLevel) {
        return serviceLevel != null
                && TRAINING_LEVEL_NAME.equalsIgnoreCase(serviceLevel.getLevelName());
    }
}
