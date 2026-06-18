package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class EmployeeActionServiceSequentialDateTest {

    @Mock
    private EmployeeActionRepository employeeActionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DesignationRepository designationRepository;

    @Mock
    private EmployeePostingRepository postingRepository;

    @Mock
    private ServiceLevelService serviceLevelService;

    @Mock
    private CareerProgressionService careerProgressionService;

    @Mock
    private OfficeService officeService;

    @InjectMocks
    private EmployeeActionService employeeActionService;

    @Test
    void newActionBeforeLatestRejected() {
        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(action(2L, LocalDate.of(2020, 1, 1))));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> employeeActionService.validateSequentialActionDate(
                        1L,
                        LocalDate.of(2019, 1, 1)
                )
        );

        assertTrue(exception.getMessage().contains("previous event"));
    }

    @Test
    void newActionOnSameDayAsLatestAllowed() {
        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(action(2L, LocalDate.of(2020, 1, 1))));

        assertDoesNotThrow(() -> employeeActionService.validateSequentialActionDate(
                1L,
                LocalDate.of(2020, 1, 1)
        ));
    }

    @Test
    void editLatestActionBeforePreviousRejected() {
        EmployeeAction first = action(1L, LocalDate.of(2018, 1, 1));
        EmployeeAction second = action(2L, LocalDate.of(2020, 1, 1));
        second.setEmployee(first.getEmployee());

        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(second, first));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> employeeActionService.validateSequentialActionDateOnUpdate(
                        second,
                        LocalDate.of(2017, 1, 1)
                )
        );

        assertTrue(exception.getMessage().contains("previous event"));
    }

    @Test
    void editLatestActionOnSameDayAsPreviousAllowed() {
        EmployeeAction first = action(1L, LocalDate.of(2020, 1, 1));
        EmployeeAction second = action(2L, LocalDate.of(2020, 6, 1));
        second.setEmployee(first.getEmployee());

        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(second, first));

        assertDoesNotThrow(() -> employeeActionService.validateSequentialActionDateOnUpdate(
                second,
                LocalDate.of(2020, 1, 1)
        ));
    }

    private EmployeeAction action(Long id, LocalDate actionDate) {
        Employee employee = new Employee();
        employee.setId(1L);

        EmployeeAction action = new EmployeeAction();
        action.setId(id);
        action.setEmployee(employee);
        action.setActionType(EmployeeActionType.PROMOTION);
        action.setActionDate(actionDate);
        return action;
    }
}
