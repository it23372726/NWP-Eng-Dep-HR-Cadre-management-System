package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.dto.VehiclePermitCollectionRequest;
import com.nwpengdep.hrms.dto.VehiclePermitStatusDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

class VehiclePermitServiceTest {

    private EmployeeRepository employeeRepository;
    private EmployeeActionRepository employeeActionRepository;
    private VehiclePermitService vehiclePermitService;
    private Employee seniorEmployee;
    private Designation seniorDesignation;
    private Designation primaryDesignation;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        employeeActionRepository = mock(EmployeeActionRepository.class);
        vehiclePermitService = new VehiclePermitService(
                employeeRepository,
                employeeActionRepository
        );

        ServiceLevel seniorLevel = ServiceLevel.builder()
                .id(1L)
                .levelName("Senior")
                .build();
        ServiceLevel primaryLevel = ServiceLevel.builder()
                .id(2L)
                .levelName("Primary")
                .build();

        seniorDesignation = Designation.builder()
                .id(10L)
                .designationName("Senior Engineer")
                .serviceLevel(seniorLevel)
                .build();
        primaryDesignation = Designation.builder()
                .id(11L)
                .designationName("Engineer")
                .serviceLevel(primaryLevel)
                .build();

        seniorEmployee = Employee.builder()
                .id(1L)
                .fullName("Senior Employee")
                .status(EmployeeStatus.ACTIVE)
                .serviceLevel(seniorLevel)
                .designation(seniorDesignation)
                .build();

        lenient().when(employeeRepository.findById(1L))
                .thenReturn(Optional.of(seniorEmployee));
        lenient().when(employeeRepository.save(any(Employee.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void nonSeniorEmployeeIsNotApplicable() {
        Employee employee = Employee.builder()
                .id(2L)
                .serviceLevel(ServiceLevel.builder().levelName("Primary").build())
                .build();
        when(employeeRepository.findById(2L)).thenReturn(Optional.of(employee));

        VehiclePermitStatusDto status = vehiclePermitService.getStatus(2L);

        assertFalse(status.isApplicable());
        assertFalse(status.isCanCollectNow());
    }

    @Test
    void seniorEmployeeCanCollectAfterSixYearsSinceSeniorEvent() {
        LocalDate seniorSince = LocalDate.now().minusYears(7);
        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitStatusDto status = vehiclePermitService.getStatus(1L);

        assertTrue(status.isApplicable());
        assertEquals(seniorSince, status.getSeniorSinceDate());
        assertNull(status.getLastCollectedDate());
        assertEquals(
                seniorSince.plusYears(6),
                status.getNextCollectableDate()
        );
        assertTrue(status.isCanCollectNow());
    }

    @Test
    void seniorEmployeeCannotCollectFirstPermitBeforeSixYearsSinceSeniorEvent() {
        LocalDate seniorSince = LocalDate.now().minusYears(5);
        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitStatusDto status = vehiclePermitService.getStatus(1L);

        assertEquals(
                seniorSince.plusYears(6),
                status.getNextCollectableDate()
        );
        assertFalse(status.isCanCollectNow());
    }

    @Test
    void seniorEmployeeCannotCollectBeforeFiveYearsSinceLastCollection() {
        LocalDate seniorSince = LocalDate.now().minusYears(10);
        LocalDate lastCollected = LocalDate.now().minusYears(4);
        seniorEmployee.setVehiclePermitCollectedDate(lastCollected);

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitStatusDto status = vehiclePermitService.getStatus(1L);

        assertEquals(lastCollected, status.getLastCollectedDate());
        assertEquals(
                lastCollected.plusYears(5),
                status.getNextCollectableDate()
        );
        assertFalse(status.isCanCollectNow());
    }

    @Test
    void recordCollectionUpdatesCollectedDate() {
        LocalDate seniorSince = LocalDate.now().minusYears(7);
        LocalDate collectedDate = LocalDate.now().minusDays(1);

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitCollectionRequest request = new VehiclePermitCollectionRequest();
        request.setCollectedDate(collectedDate);

        VehiclePermitStatusDto status = vehiclePermitService.recordCollection(1L, request);

        assertEquals(collectedDate, seniorEmployee.getVehiclePermitCollectedDate());
        assertEquals(collectedDate, status.getLastCollectedDate());
        assertEquals(
                collectedDate.plusYears(5),
                status.getNextCollectableDate()
        );
        verify(employeeRepository).save(seniorEmployee);
    }

    @Test
    void recordCollectionRejectsDateBeforeNextCollectableDate() {
        LocalDate seniorSince = LocalDate.now().minusYears(7);
        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitCollectionRequest request = new VehiclePermitCollectionRequest();
        request.setCollectedDate(seniorSince.plusYears(5));

        assertThrows(
                IllegalArgumentException.class,
                () -> vehiclePermitService.recordCollection(1L, request)
        );
    }

    @Test
    void recordCollectionRejectsDateBeforeSeniorSinceDate() {
        LocalDate seniorSince = LocalDate.now().minusYears(6);
        seniorEmployee.setVehiclePermitCollectedDate(seniorSince.minusYears(10));

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitCollectionRequest request = new VehiclePermitCollectionRequest();
        request.setCollectedDate(seniorSince.minusDays(1));

        assertThrows(
                IllegalArgumentException.class,
                () -> vehiclePermitService.recordCollection(1L, request)
        );
    }

    @Test
    void undoCollectionClearsCollectedDate() {
        LocalDate seniorSince = LocalDate.now().minusYears(10);
        LocalDate lastCollected = LocalDate.now().minusYears(4);
        seniorEmployee.setVehiclePermitCollectedDate(lastCollected);

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitStatusDto status = vehiclePermitService.undoCollection(1L);

        assertNull(seniorEmployee.getVehiclePermitCollectedDate());
        assertNull(status.getLastCollectedDate());
        assertEquals(
                seniorSince.plusYears(6),
                status.getNextCollectableDate()
        );
        verify(employeeRepository).save(seniorEmployee);
    }

    @Test
    void undoCollectionRejectsWhenNoCollectionRecorded() {
        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(
                        EmployeeActionType.PROMOTION,
                        LocalDate.now().minusYears(6),
                        seniorDesignation
                )
        ));

        assertThrows(
                IllegalArgumentException.class,
                () -> vehiclePermitService.undoCollection(1L)
        );
    }

    @Test
    void updateCollectionChangesCollectedDate() {
        LocalDate seniorSince = LocalDate.now().minusYears(10);
        LocalDate lastCollected = LocalDate.now().minusYears(4);
        LocalDate updatedDate = LocalDate.now().minusYears(3);
        seniorEmployee.setVehiclePermitCollectedDate(lastCollected);

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitCollectionRequest request = new VehiclePermitCollectionRequest();
        request.setCollectedDate(updatedDate);

        VehiclePermitStatusDto status = vehiclePermitService.updateCollection(1L, request);

        assertEquals(updatedDate, seniorEmployee.getVehiclePermitCollectedDate());
        assertEquals(updatedDate, status.getLastCollectedDate());
        assertEquals(
                updatedDate.plusYears(5),
                status.getNextCollectableDate()
        );
        verify(employeeRepository).save(seniorEmployee);
    }

    @Test
    void updateCollectionRejectsWhenNoCollectionRecorded() {
        LocalDate seniorSince = LocalDate.now().minusYears(6);

        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(EmployeeActionType.PROMOTION, seniorSince, seniorDesignation)
        ));

        VehiclePermitCollectionRequest request = new VehiclePermitCollectionRequest();
        request.setCollectedDate(LocalDate.now().minusDays(1));

        assertThrows(
                IllegalArgumentException.class,
                () -> vehiclePermitService.updateCollection(1L, request)
        );
    }

    @Test
    void seniorWithNoSeniorEventInHistoryCannotCollect() {
        when(employeeActionRepository.findCareerActionsByEmployeeIdOrderByActionDateAsc(
                eq(1L),
                any()
        )).thenReturn(List.of(
                seniorAction(
                        EmployeeActionType.PROMOTION,
                        LocalDate.now().minusYears(10),
                        primaryDesignation
                )
        ));

        VehiclePermitStatusDto status = vehiclePermitService.getStatus(1L);

        assertNull(status.getSeniorSinceDate());
        assertFalse(status.isCanCollectNow());
        assertEquals(
                "Senior start date could not be determined from career history",
                status.getMessage()
        );
    }

    private EmployeeAction seniorAction(
            EmployeeActionType type,
            LocalDate actionDate,
            Designation designation
    ) {
        EmployeeAction action = new EmployeeAction();
        action.setActionType(type);
        action.setActionDate(actionDate);
        action.setNewDesignation(designation);
        return action;
    }
}
