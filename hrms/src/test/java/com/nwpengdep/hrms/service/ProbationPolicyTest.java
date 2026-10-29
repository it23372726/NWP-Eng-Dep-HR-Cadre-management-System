package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeServiceAppointment;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ProbationPolicyTest {
    private EmployeeServiceAppointment period(String key, String start, String confirmation) {
        EmployeeServiceAppointment p = new EmployeeServiceAppointment();
        p.setAppointmentKey(key); p.setStartDate(LocalDate.parse(start));
        p.setPermanentConfirmationDate(confirmation == null ? null : LocalDate.parse(confirmation));
        return p;
    }
    private Employee employee(EmployeeServiceAppointment prior) {
        Employee e = new Employee(); e.setCurrentServiceAppointmentKey("second");
        e.setDateOfFirstAppointment(LocalDate.of(2020, 7, 1));
        e.setServiceAppointments(new ArrayList<>(List.of(prior))); return e;
    }
    @Test void initialAppointmentNeverGetsReducedProbation() {
        Employee e = employee(period("old", "2010-01-01", "2013-01-01"));
        e.setCurrentServiceAppointmentKey(null);
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(e));
        e.setCurrentServiceAppointmentKey("INITIAL");
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(e));
    }
    @Test void requiresConfirmationAfterThreeYearsNotJustLongService() {
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(employee(period("INITIAL", "2010-01-01", null))));
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(employee(period("INITIAL", "2010-01-01", "2012-12-31"))));
        assertEquals(1, ProbationPolicy.yearsForCurrentAppointment(employee(period("INITIAL", "2010-01-01", "2013-01-01"))));
    }
    @Test void excludesSupersededArchivedAndFutureConfirmations() {
        EmployeeServiceAppointment p = period("INITIAL", "2010-01-01", "2013-01-01");
        Employee e = employee(p); p.setSuperseded(true);
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(e));
        p.setSuperseded(false); p.setArchivedSnapshot(true);
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(e));
        p.setArchivedSnapshot(false); p.setPermanentConfirmationDate(LocalDate.of(2021, 1, 1));
        assertEquals(3, ProbationPolicy.yearsForCurrentAppointment(e));
    }
    @Test void existingStoredThreeYearDateIsCalculatedUsingNewRuleWithoutRewrite() {
        Employee e = employee(period("INITIAL", "2010-01-01", "2013-01-01"));
        EmployeeServiceAppointment current = period("second", "2020-07-01", null);
        current.setEmployee(e); current.setProbationEndDate(LocalDate.of(2023, 7, 1));
        e.getServiceAppointments().add(current);
        assertEquals(LocalDate.of(2021, 7, 1), current.getProbationEndDate());
        assertEquals(LocalDate.of(2021, 7, 1), new CareerProgressionService().getThreeYearRequirementDate(e));
    }
    @Test void leapYearAnniversaryUsesLastDayOfFebruary() {
        assertTrue(ProbationPolicy.completedInitialProbation(LocalDate.of(2016,2,29), LocalDate.of(2019,2,28)));
        assertFalse(ProbationPolicy.completedInitialProbation(LocalDate.of(2016,2,29), LocalDate.of(2019,2,27)));
    }
}
