package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class CadreVacancyCalculatorTest {

    @Test
    void vacancyIsApprovedMinusOccupiedAndNeverNegative() {
        assertEquals(2L, CadreVacancyCalculator.vacancy(5, 3));
        assertEquals(0L, CadreVacancyCalculator.vacancy(5, 5));
        assertEquals(0L, CadreVacancyCalculator.vacancy(5, 8));
    }

    @Test
    void excessIsOccupiedMinusApprovedAndNeverNegative() {
        assertEquals(0L, CadreVacancyCalculator.excess(5, 3));
        assertEquals(0L, CadreVacancyCalculator.excess(5, 5));
        assertEquals(3L, CadreVacancyCalculator.excess(5, 8));
    }

    @Test
    void aDesignationDoesNotShowVacancyAndExcessTogether() {
        long approved = 10;
        long occupied = 7;

        long vacancy = CadreVacancyCalculator.vacancy(approved, occupied);
        long excess = CadreVacancyCalculator.excess(approved, occupied);

        assertEquals(3L, vacancy);
        assertEquals(0L, excess);
        assertEquals(0L, Math.min(vacancy, excess));
    }
}
