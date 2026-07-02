package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class AllEmployeeDetailsReportServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private AllEmployeeDetailsReportService reportService;

    @Test
    void generateReportIncludesOnlyEmployeesCurrentlyInNwpDepartment() {
        Employee nwpEmployee = Employee.builder()
                .id(1L)
                .employeeNo("101")
                .fullName("NWP Staff")
                .currentDepartment(DepartmentConstants.NWP_ENGINEERING)
                .build();
        Employee otherDepartmentEmployee = Employee.builder()
                .id(2L)
                .employeeNo("102")
                .fullName("Other Dept Staff")
                .currentDepartment("Other Department")
                .build();

        when(employeeRepository.findAllForEmployeeDetailsReport())
                .thenReturn(List.of(nwpEmployee, otherDepartmentEmployee));

        var report = reportService.generateReport();

        assertEquals(1, report.getTotalCount());
        assertEquals(1, report.getRows().size());
        assertEquals("NWP Staff", report.getRows().getFirst().getEmployeeName());
    }

    @Test
    void generateReportExcludesEmployeesWithNoCurrentDepartment() {
        Employee noDepartmentEmployee = Employee.builder()
                .id(3L)
                .employeeNo("103")
                .fullName("No Department")
                .currentDepartment(null)
                .build();

        when(employeeRepository.findAllForEmployeeDetailsReport())
                .thenReturn(List.of(noDepartmentEmployee));

        var report = reportService.generateReport();

        assertEquals(0, report.getTotalCount());
        assertTrue(report.getRows().isEmpty());
    }
}
