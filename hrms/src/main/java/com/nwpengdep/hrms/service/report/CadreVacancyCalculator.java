package com.nwpengdep.hrms.service.report;

/**
 * Vacancy and excess against approved cadre. A designation can show one or
 * the other, not both: leftover approved posts are vacancies; staff above
 * approved strength are excess.
 */
public final class CadreVacancyCalculator {

    private CadreVacancyCalculator() {
    }

    public static long vacancy(long approvedCount, long occupiedCount) {
        return Math.max(0, approvedCount - occupiedCount);
    }

    public static long excess(long approvedCount, long occupiedCount) {
        return Math.max(0, occupiedCount - approvedCount);
    }
}
