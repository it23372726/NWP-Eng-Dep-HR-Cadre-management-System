package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;

/**
 * Shared annual-increment day and eligibility rules. This does not
 * calculate salary amounts — only scheduled due dates by year.
 */
public final class SalaryIncrementSchedule {

    private SalaryIncrementSchedule() {
    }

    public static LocalDate resolveDueDate(String incrementDate, Integer year) {
        if (incrementDate == null || incrementDate.isBlank() || year == null) {
            return null;
        }

        if (!incrementDate.matches("\\d{2}-\\d{2}")) {
            return null;
        }

        try {
            MonthDay monthDay = MonthDay.parse("--" + incrementDate);
            return monthDay.atYear(year);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public static boolean isEligibleEmployee(Employee employee) {
        if (employee == null || employee.getStatus() != EmployeeStatus.ACTIVE) {
            return false;
        }

        if (employee.getEmploymentType() == EmploymentType.CONTRACT) {
            return false;
        }

        String incrementDate = employee.getIncremantDate();
        if (incrementDate == null || incrementDate.isBlank()) {
            return false;
        }

        return employee.getDateOfFirstAppointment() != null
                && resolveDueDate(
                        incrementDate,
                        employee.getDateOfFirstAppointment().getYear()
                ) != null;
    }

    public static boolean isEligibleDueDate(LocalDate dueDate, LocalDate firstAppointment) {
        return dueDate != null
                && firstAppointment != null
                && !dueDate.isBefore(firstAppointment);
    }

    public static boolean isEligibleDueDate(Employee employee, LocalDate dueDate, LocalDate firstAppointment) {
        return isEligibleDueDate(dueDate, firstAppointment)
                && (employee.getIncrementScheduleEndDate() == null || dueDate.isBefore(employee.getIncrementScheduleEndDate()));
    }

    public static LocalDate firstDueBoundary(Employee employee) {
        return employee.getFirstIncrementDueDate() != null
                ? employee.getFirstIncrementDueDate() : employee.getDateOfFirstAppointment();
    }

    public static List<Integer> eligibleYearsThrough(
            Employee employee,
            int endYear
    ) {
        List<Integer> years = new ArrayList<>();
        LocalDate firstAppt = firstDueBoundary(employee);
        if (firstAppt == null) {
            return years;
        }

        String incrementDate = employee.getIncremantDate();
        for (int year = firstAppt.getYear(); year <= endYear; year++) {
            LocalDate due = resolveDueDate(incrementDate, year);
            if (isEligibleDueDate(employee, due, firstAppt)) {
                years.add(year);
            }
        }
        return years;
    }
}
