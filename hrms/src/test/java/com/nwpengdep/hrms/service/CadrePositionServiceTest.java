package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.VacancyReportResponse;
import com.nwpengdep.hrms.entity.CadrePosition;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class CadrePositionServiceTest {

    private static final String PRIMARY_DEPARTMENT = "NWP Engineering Department";

    @Mock
    private CadrePositionRepository cadreRepository;

    @Mock
    private DesignationRepository designationRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private CadrePositionService cadrePositionService;

    @BeforeEach
    void setPrimaryDepartment() {
        DepartmentConstants.setPrimaryDepartmentName(PRIMARY_DEPARTMENT);
    }

    @AfterEach
    void clearPrimaryDepartment() {
        DepartmentConstants.setPrimaryDepartmentName("");
    }

    @Test
    void vacancyReportCountsStaffInConfiguredPrimaryDepartment() {
        Designation engineer = designation("Engineer", 10L);
        when(cadreRepository.findAll()).thenReturn(List.of(
                cadre(engineer, 5, 1)
        ));
        when(employeeRepository.countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                10L,
                EmployeeStatus.ACTIVE,
                PRIMARY_DEPARTMENT
        )).thenReturn(3L);

        List<VacancyReportResponse> report = cadrePositionService.getVacancyReport();

        VacancyReportResponse row = report.getFirst();
        assertEquals("Engineer", row.getDesignationName());
        assertEquals(5, row.getApprovedCount());
        assertEquals(3L, row.getCurrentCount());
        assertEquals(2L, row.getVacancyCount());
        assertEquals(0L, row.getExcessCount());

        verify(employeeRepository).countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                10L,
                EmployeeStatus.ACTIVE,
                PRIMARY_DEPARTMENT
        );
        verify(employeeRepository, never())
                .countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                        anyLong(),
                        any(EmployeeStatus.class),
                        eq("")
                );
    }

    @Test
    void vacancyReportShowsExcessWhenOccupiedExceedsApproved() {
        Designation clerk = designation("Clerk", 20L);
        when(cadreRepository.findAll()).thenReturn(List.of(
                cadre(clerk, 2, 1)
        ));
        when(employeeRepository.countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                20L,
                EmployeeStatus.ACTIVE,
                PRIMARY_DEPARTMENT
        )).thenReturn(5L);

        List<VacancyReportResponse> report = cadrePositionService.getVacancyReport();

        VacancyReportResponse row = report.getFirst();
        assertEquals(2, row.getApprovedCount());
        assertEquals(5L, row.getCurrentCount());
        assertEquals(0L, row.getVacancyCount());
        assertEquals(3L, row.getExcessCount());
    }

    @Test
    void vacancyReportTotalsSumPerRowVacancyAndExcess() {
        Designation vacantPost = designation("Vacant Post", 1L);
        Designation excessPost = designation("Excess Post", 2L);
        when(cadreRepository.findAll()).thenReturn(List.of(
                cadre(vacantPost, 4, 1),
                cadre(excessPost, 1, 2)
        ));
        when(employeeRepository.countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                1L,
                EmployeeStatus.ACTIVE,
                PRIMARY_DEPARTMENT
        )).thenReturn(1L);
        when(employeeRepository.countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                2L,
                EmployeeStatus.ACTIVE,
                PRIMARY_DEPARTMENT
        )).thenReturn(3L);

        List<VacancyReportResponse> report = cadrePositionService.getVacancyReport();
        VacancyReportResponse totals = report.get(2);

        assertEquals("TOTAL", totals.getDesignationName());
        assertEquals(true, totals.isTotalsRow());
        assertEquals(5, totals.getApprovedCount());
        assertEquals(4L, totals.getCurrentCount());
        assertEquals(3L, totals.getVacancyCount());
        assertEquals(2L, totals.getExcessCount());
    }

    @Test
    void vacancyReportCountsZeroWhenPrimaryDepartmentIsNotConfigured() {
        DepartmentConstants.setPrimaryDepartmentName("");
        Designation engineer = designation("Engineer", 10L);
        when(cadreRepository.findAll()).thenReturn(List.of(
                cadre(engineer, 5, 1)
        ));

        List<VacancyReportResponse> report = cadrePositionService.getVacancyReport();

        VacancyReportResponse row = report.getFirst();
        assertEquals(0L, row.getCurrentCount());
        assertEquals(5L, row.getVacancyCount());
        assertEquals(0L, row.getExcessCount());
        verify(employeeRepository, never())
                .countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
                        anyLong(),
                        any(EmployeeStatus.class),
                        any()
                );
    }

    private static CadrePosition cadre(Designation designation, int approved, int order) {
        return CadrePosition.builder()
                .id((long) order)
                .designation(designation)
                .approvedCount(approved)
                .displayOrder(order)
                .build();
    }

    private static Designation designation(String name, long id) {
        return Designation.builder()
                .id(id)
                .designationName(name)
                .service(ServiceType.builder().id(1L).serviceCode("ENG").build())
                .serviceLevel(ServiceLevel.builder().id(1L).levelName("Secondary").build())
                .build();
    }
}
