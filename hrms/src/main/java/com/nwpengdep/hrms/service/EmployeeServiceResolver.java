package com.nwpengdep.hrms.service;

import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.ServiceType;

@Component
public class EmployeeServiceResolver {

    public ServiceType resolve(Employee employee) {
        if (employee == null) {
            return null;
        }
        if (employee.getDesignation() != null
                && employee.getDesignation().getService() != null) {
            return employee.getDesignation().getService();
        }
        return employee.getService();
    }
}
