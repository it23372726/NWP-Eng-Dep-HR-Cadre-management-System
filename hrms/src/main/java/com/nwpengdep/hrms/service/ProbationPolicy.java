package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Employee;
import java.time.LocalDate;

/** A confirmed three-year probation qualifies subsequent service appointments for one year. */
public final class ProbationPolicy {
    public static final int INITIAL_YEARS = 3;
    public static final int SUBSEQUENT_YEARS = 1;

    private ProbationPolicy() { }

    public static boolean completedInitialProbation(LocalDate start, LocalDate confirmation) {
        return start != null && confirmation != null
                && !confirmation.isBefore(start.plusYears(INITIAL_YEARS));
    }

    public static int yearsForCurrentAppointment(Employee employee) {
        return employee == null ? INITIAL_YEARS : yearsForAppointment(employee,
                employee.getCurrentServiceAppointmentKey(), employee.getDateOfFirstAppointment());
    }

    public static int yearsForAppointment(Employee employee, String appointmentKey, LocalDate start) {
        if (employee == null || appointmentKey == null || "INITIAL".equals(appointmentKey)
                || start == null || employee.getServiceAppointments() == null) return INITIAL_YEARS;
        return employee.getServiceAppointments().stream().anyMatch(p -> !p.isSuperseded() && !p.isArchivedSnapshot()
                && !appointmentKey.equals(p.getAppointmentKey())
                && p.getStartDate() != null && p.getStartDate().isBefore(start)
                && completedInitialProbation(p.getStartDate(), p.getPermanentConfirmationDate())
                && !p.getPermanentConfirmationDate().isAfter(start)) ? SUBSEQUENT_YEARS : INITIAL_YEARS;
    }
}
