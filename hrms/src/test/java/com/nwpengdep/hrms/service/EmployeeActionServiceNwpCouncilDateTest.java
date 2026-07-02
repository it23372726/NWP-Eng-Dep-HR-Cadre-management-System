package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class EmployeeActionServiceNwpCouncilDateTest {

    private static final String NWP = DepartmentConstants.NWP_ENGINEERING;
    private static final String OTHER = "Other Department";

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
    private EmployeeRequirementSyncService requirementSyncService;

    @Mock
    private OfficeService officeService;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private EmployeeActionService employeeActionService;

    private Employee employee;

    @BeforeEach
    void setUp() {
        employee = Employee.builder()
                .id(1L)
                .build();

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(careerProgressionService.ensureCareerProgression(employee))
                .thenAnswer(invocation -> {
                    Employee target = invocation.getArgument(0);
                    if (target.getCareerProgression() == null) {
                        EmployeeCareerProgression progression = new EmployeeCareerProgression();
                        progression.setEmployee(target);
                        target.setCareerProgression(progression);
                    }
                    return target.getCareerProgression();
                });
        when(employeeRepository.save(any(Employee.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void nwpAppointmentSetsCouncilDateToAppointmentDate() {
        LocalDate appointmentDate = LocalDate.of(2020, 1, 15);
        stubActions(appointment(1L, appointmentDate, NWP, "Head Office"));

        employeeActionService.recalculateEmployeeState(1L);

        Employee saved = captureSavedEmployee();
        assertEquals(appointmentDate, saved.getEnteredDateToNWPCouncil());
        assertEquals(appointmentDate, saved.getReportedDateToPresentWorkingPlace());
    }

    @Test
    void transferIntoNwpSetsCouncilDateToTransferDate() {
        LocalDate appointmentDate = LocalDate.of(2018, 3, 1);
        LocalDate transferDate = LocalDate.of(2021, 1, 10);
        stubActions(
                appointment(1L, appointmentDate, OTHER, "Regional Office"),
                transferOut(2L, transferDate, NWP, "Puttalam Office")
        );

        employeeActionService.recalculateEmployeeState(1L);

        Employee saved = captureSavedEmployee();
        assertEquals(transferDate, saved.getEnteredDateToNWPCouncil());
        assertEquals(transferDate, saved.getReportedDateToPresentWorkingPlace());
    }

    @Test
    void officeChangeDoesNotUpdateCouncilDate() {
        LocalDate appointmentDate = LocalDate.of(2020, 1, 15);
        LocalDate officeChangeDate = LocalDate.of(2022, 6, 1);
        stubActions(
                appointment(1L, appointmentDate, NWP, "Head Office"),
                officeChange(2L, officeChangeDate, NWP, "Kurunegala Office")
        );

        employeeActionService.recalculateEmployeeState(1L);

        Employee saved = captureSavedEmployee();
        assertEquals(appointmentDate, saved.getEnteredDateToNWPCouncil());
        assertEquals(officeChangeDate, saved.getReportedDateToPresentWorkingPlace());
    }

    @Test
    void rejoiningNwpDoesNotChangeOriginalCouncilDate() {
        LocalDate firstNwpJoin = LocalDate.of(2015, 4, 1);
        LocalDate rejoinDate = LocalDate.of(2025, 2, 1);
        stubActions(
                appointment(1L, LocalDate.of(2010, 1, 1), OTHER, "Regional Office"),
                transferOut(2L, firstNwpJoin, NWP, "Head Office"),
                transferOut(3L, LocalDate.of(2020, 6, 1), OTHER, "Regional Office"),
                transferOut(4L, rejoinDate, NWP, "Puttalam Office")
        );

        employeeActionService.recalculateEmployeeState(1L);

        Employee saved = captureSavedEmployee();
        assertEquals(firstNwpJoin, saved.getEnteredDateToNWPCouncil());
        assertEquals(rejoinDate, saved.getReportedDateToPresentWorkingPlace());
    }

    @Test
    void neverJoiningNwpLeavesCouncilDateNull() {
        LocalDate appointmentDate = LocalDate.of(2020, 1, 15);
        stubActions(appointment(1L, appointmentDate, OTHER, "Regional Office"));

        employeeActionService.recalculateEmployeeState(1L);

        Employee saved = captureSavedEmployee();
        assertNull(saved.getEnteredDateToNWPCouncil());
        assertEquals(appointmentDate, saved.getReportedDateToPresentWorkingPlace());
    }

    @Test
    void deleteNwpTransferRecalculatesCouncilDateToNull() {
        LocalDate appointmentDate = LocalDate.of(2018, 3, 1);
        LocalDate transferDate = LocalDate.of(2021, 1, 10);

        EmployeeAction appointment = appointment(1L, appointmentDate, OTHER, "Regional Office");
        EmployeeAction transferOut = transferOut(2L, transferDate, NWP, "Puttalam Office");
        transferOut.setEmployee(employee);

        when(employeeActionRepository.findById(2L)).thenReturn(Optional.of(transferOut));
        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(transferOut, appointment));
        when(currentUserService.getCurrentUsernameOrDefault("system")).thenReturn("tester");

        employeeActionService.deleteEmployeeAction(2L);

        Employee saved = captureSavedEmployee();
        assertNull(saved.getEnteredDateToNWPCouncil());
        assertEquals(appointmentDate, saved.getReportedDateToPresentWorkingPlace());
    }

    private void stubActions(EmployeeAction... actions) {
        when(employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(1L))
                .thenReturn(List.of(actions));
    }

    private Employee captureSavedEmployee() {
        ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepository).save(captor.capture());
        return captor.getValue();
    }

    private EmployeeAction appointment(
            Long id,
            LocalDate actionDate,
            String department,
            String office
    ) {
        return EmployeeAction.builder()
                .id(id)
                .employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT)
                .actionDate(actionDate)
                .department(department)
                .office(office)
                .build();
    }

    private EmployeeAction officeChange(
            Long id,
            LocalDate actionDate,
            String department,
            String office
    ) {
        return EmployeeAction.builder()
                .id(id)
                .employee(employee)
                .actionType(EmployeeActionType.OFFICE_CHANGE)
                .actionDate(actionDate)
                .department(department)
                .office(office)
                .build();
    }

    private EmployeeAction transferOut(
            Long id,
            LocalDate actionDate,
            String department,
            String office
    ) {
        return EmployeeAction.builder()
                .id(id)
                .employee(employee)
                .actionType(EmployeeActionType.TRANSFER_OUT)
                .actionDate(actionDate)
                .department(department)
                .office(office)
                .toDepartment(department)
                .toOffice(office)
                .build();
    }
}
