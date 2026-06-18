package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.dto.EmployeeSummaryReportResponse;
import com.nwpengdep.hrms.dto.WorkplaceHistoryRowDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class EmployeeWorkplaceHistoryServiceTest {

    @Mock
    private EmployeeActionRepository employeeActionRepository;

    @InjectMocks
    private EmployeeWorkplaceHistoryService workplaceHistoryService;

    @Test
    void firstAppointmentOnlyProducesSinglePresentRow() {
        Employee employee = activeEmployee(1L);
        EmployeeAction appointment = EmployeeAction.builder()
                .id(1L)
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(LocalDate.of(2020, 1, 15))
                .department("NWP Engineering Dept")
                .office("Head Office")
                .build();

        when(employeeActionRepository.findActiveActionsByEmployeeIdOrderByActionDateAsc(1L))
                .thenReturn(List.of(appointment));

        List<WorkplaceHistoryRowDto> rows = workplaceHistoryService.buildHistory(employee);

        assertEquals(1, rows.size());
        assertEquals(LocalDate.of(2020, 1, 15), rows.get(0).getFromDate());
        assertEquals("Present", rows.get(0).getToDateLabel());
        assertNull(rows.get(0).getToDate());
        assertEquals("NWP Engineering Dept — Head Office", rows.get(0).getWorkingPlace());
    }

    @Test
    void appointmentAndOfficeChangeProduceTwoRowsWithBoundaryDates() {
        Employee employee = activeEmployee(2L);
        EmployeeAction appointment = EmployeeAction.builder()
                .id(1L)
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(LocalDate.of(2020, 1, 15))
                .department("NWP Engineering Dept")
                .office("Head Office")
                .build();
        EmployeeAction officeChange = EmployeeAction.builder()
                .id(2L)
                .employee(employee)
                .actionType(EmployeeActionType.OFFICE_CHANGE)
                .actionDate(LocalDate.of(2022, 6, 1))
                .department("NWP Engineering Dept")
                .office("Kurunegala Office")
                .build();

        when(employeeActionRepository.findActiveActionsByEmployeeIdOrderByActionDateAsc(2L))
                .thenReturn(List.of(appointment, officeChange));

        List<WorkplaceHistoryRowDto> rows = workplaceHistoryService.buildHistory(employee);

        assertEquals(2, rows.size());
        assertEquals(LocalDate.of(2020, 1, 15), rows.get(0).getFromDate());
        assertEquals(LocalDate.of(2022, 6, 1), rows.get(0).getToDate());
        assertEquals("NWP Engineering Dept — Head Office", rows.get(0).getWorkingPlace());

        assertEquals(LocalDate.of(2022, 6, 1), rows.get(1).getFromDate());
        assertEquals("Present", rows.get(1).getToDateLabel());
        assertEquals("NWP Engineering Dept — Kurunegala Office", rows.get(1).getWorkingPlace());
    }

    @Test
    void transferOutUsesDestinationWorkplaceAndSkipsLinkedTransferIn() {
        Employee employee = activeEmployee(3L);
        EmployeeAction appointment = EmployeeAction.builder()
                .id(1L)
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(LocalDate.of(2018, 3, 1))
                .department("Other Department")
                .office("Regional Office")
                .build();
        EmployeeAction transferOut = EmployeeAction.builder()
                .id(2L)
                .employee(employee)
                .actionType(EmployeeActionType.TRANSFER_OUT)
                .actionDate(LocalDate.of(2021, 1, 10))
                .toDepartment("NWP Engineering Dept")
                .toOffice("Puttalam Office")
                .department("NWP Engineering Dept")
                .office("Puttalam Office")
                .build();
        EmployeeAction linkedTransferIn = EmployeeAction.builder()
                .id(3L)
                .employee(employee)
                .actionType(EmployeeActionType.TRANSFER_IN)
                .actionDate(LocalDate.of(2021, 1, 10))
                .linkedActionId(2L)
                .department("NWP Engineering Dept")
                .office("Puttalam Office")
                .build();

        when(employeeActionRepository.findActiveActionsByEmployeeIdOrderByActionDateAsc(3L))
                .thenReturn(List.of(appointment, transferOut, linkedTransferIn));

        List<WorkplaceHistoryRowDto> rows = workplaceHistoryService.buildHistory(employee);

        assertEquals(2, rows.size());
        assertEquals("Other Department — Regional Office", rows.get(0).getWorkingPlace());
        assertEquals(LocalDate.of(2021, 1, 10), rows.get(0).getToDate());
        assertEquals("NWP Engineering Dept — Puttalam Office", rows.get(1).getWorkingPlace());
        assertEquals("Present", rows.get(1).getToDateLabel());
    }

    @Test
    void retiredEmployeeClosesLastRowWithTerminalDate() {
        Employee employee = Employee.builder()
                .id(4L)
                .status(EmployeeStatus.INACTIVE)
                .build();
        EmployeeAction appointment = EmployeeAction.builder()
                .id(1L)
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(LocalDate.of(1990, 5, 1))
                .department("NWP Engineering Dept")
                .office("Head Office")
                .build();
        EmployeeAction retirement = EmployeeAction.builder()
                .id(2L)
                .employee(employee)
                .actionType(EmployeeActionType.RETIREMENT_OR_RESIGNATION)
                .actionDate(LocalDate.of(2024, 12, 31))
                .build();

        when(employeeActionRepository.findActiveActionsByEmployeeIdOrderByActionDateAsc(4L))
                .thenReturn(List.of(appointment, retirement));

        List<WorkplaceHistoryRowDto> rows = workplaceHistoryService.buildHistory(employee);

        assertEquals(1, rows.size());
        assertEquals(LocalDate.of(2024, 12, 31), rows.get(0).getToDate());
        assertNull(rows.get(0).getToDateLabel());
    }

    private Employee activeEmployee(Long id) {
        return Employee.builder()
                .id(id)
                .status(EmployeeStatus.ACTIVE)
                .build();
    }
}
