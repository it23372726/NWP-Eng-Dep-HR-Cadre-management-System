package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

class CareerHistoryValidatorTest {

    private DesignationRepository designationRepository;
    private ServiceTypeRepository serviceTypeRepository;
    private OfficeService officeService;
    private CareerHistoryValidator validator;

    private Designation engineerServiceA;
    private Designation seniorEngineerServiceA;
    private Designation clerkServiceB;
    private ServiceLevel primaryLevel;

    @BeforeEach
    void setUp() {
        designationRepository = mock(DesignationRepository.class);
        serviceTypeRepository = mock(ServiceTypeRepository.class);
        officeService = mock(OfficeService.class);
        validator = new CareerHistoryValidator(
                designationRepository,
                serviceTypeRepository,
                new DesignationAssignmentValidator(),
                new CareerProgressionService(),
                officeService
        );

        ServiceType serviceA = serviceType(1L);
        serviceA.setGrade2RequiredYears(5);
        serviceA.setGrade1RequiredYears(4);
        ServiceType serviceB = serviceType(2L);

        primaryLevel = serviceLevel(10L, "Primary");

        engineerServiceA = designation(1L, serviceA, primaryLevel);
        seniorEngineerServiceA = designation(2L, serviceA, primaryLevel);
        clerkServiceB = designation(3L, serviceB, primaryLevel);

        lenient().when(designationRepository.findById(anyLong()))
                .thenReturn(Optional.empty());
        lenient().when(designationRepository.findById(1L))
                .thenReturn(Optional.of(engineerServiceA));
        lenient().when(designationRepository.findById(2L))
                .thenReturn(Optional.of(seniorEngineerServiceA));
        lenient().when(designationRepository.findById(3L))
                .thenReturn(Optional.of(clerkServiceB));
        lenient().when(serviceTypeRepository.findById(1L))
                .thenReturn(Optional.of(serviceA));
        lenient().when(serviceTypeRepository.findById(2L))
                .thenReturn(Optional.of(serviceB));
    }

    @Test
    void customFirstAppointmentAndPromotionInSameServicePasses() {
        CareerHistoryEventRequest first =
                event(EmployeeActionType.NEW_APPOINTMENT, "1990-01-01");
        first.setRecordedDesignationName("Assistant Engineer (Historical)");
        first.setServiceId(1L);
        first.setServiceLevelId(10L);
        first.setGrade(Grade.III);

        CareerHistoryEventRequest promotion =
                event(EmployeeActionType.PROMOTION, "1995-01-01");
        promotion.setRecordedDesignationName("Engineer (Historical)");
        promotion.setServiceLevelId(10L);
        promotion.setGrade(Grade.II);

        assertDoesNotThrow(() -> validator.validate(List.of(first, promotion)));
    }

    @Test
    void customFirstAppointmentRequiresService() {
        CareerHistoryEventRequest first =
                event(EmployeeActionType.NEW_APPOINTMENT, "1990-01-01");
        first.setRecordedDesignationName("Assistant Engineer (Historical)");
        first.setServiceLevelId(10L);
        first.setGrade(Grade.III);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(List.of(first))
        );
        assertTrue(exception.getMessage().contains("service"));
    }

    @Test
    void typicalPermanentCareerPasses() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2020-01-01", 2L, Grade.II),
                gradeUpdate("2024-01-01", Grade.I)
        );

        assertDoesNotThrow(() -> validator.validate(events));
    }

    @Test
    void firstEventMustBeFirstAppointment() {
        List<CareerHistoryEventRequest> events = List.of(
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("first appointment"));
    }

    @Test
    void outOfOrderDatesRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2014-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("chronological"));
    }

    @Test
    void futureDateRejected() {
        CareerHistoryEventRequest appointment = appointment("2015-01-01", 1L);
        appointment.setActionDate(LocalDate.now().plusDays(1));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(List.of(appointment))
        );
        assertTrue(exception.getMessage().contains("future"));
    }

    @Test
    void gradeSkippingRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                gradeUpdate("2020-01-01", Grade.I)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("invalid grade step"));
    }

    @Test
    void supraToSpecialStepRejected() {
        ServiceType supraService = serviceType(1L, Grade.SUPRA);
        supraService.setGrade2RequiredYears(5);
        supraService.setGrade1RequiredYears(4);
        supraService.setSupraRequiredYears(2);
        lenient().when(designationRepository.findById(1L))
                .thenReturn(Optional.of(designation(1L, supraService, primaryLevel)));
        lenient().when(serviceTypeRepository.findById(1L))
                .thenReturn(Optional.of(supraService));

        List<CareerHistoryEventRequest> events = List.of(
                appointment("2010-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2013-01-01"),
                gradeUpdate("2015-01-01", Grade.II),
                gradeUpdate("2019-01-01", Grade.I),
                gradeUpdate("2021-01-01", Grade.SUPRA),
                gradeUpdate("2022-01-01", Grade.SPECIAL)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(
                exception.getMessage().toLowerCase().contains("invalid grade step")
                || exception.getMessage().toLowerCase().contains("not allowed"),
                () -> exception.getMessage()
        );
    }

    @Test
    void crossServicePromotionRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                promotion("2020-01-01", 3L, Grade.II)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("same service"));
    }

    @Test
    void eventAfterDeathRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.DEATH, "2020-01-01"),
                event(EmployeeActionType.TRANSFER_IN, "2021-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("death"));
    }

    @Test
    void permanentConfirmationOnlyOnce() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2019-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("once"));
    }

    @Test
    void permanentConfirmationRequiresGradeThree() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                gradeUpdate("2020-01-01", Grade.II),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2021-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("Grade III"));
    }

    @Test
    void eventsWhileOutOfServiceRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.RETIREMENT_OR_RESIGNATION, "2020-01-01"),
                promotion("2021-01-01", 2L, Grade.II)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("out of service"));
    }

    @Test
    void transferOutRequiresDestinationDepartment() {
        CareerHistoryEventRequest transferOut =
                event(EmployeeActionType.TRANSFER_OUT, "2020-01-01");
        transferOut.setToDepartment("Western Province Engineering Department");
        transferOut.setToOffice("Kurunegala Office");
        transferOut.setDesignationId(1L);
        transferOut.setServiceLevelId(10L);

        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                transferOut
        );

        assertDoesNotThrow(() -> validator.validate(events));
    }

    @Test
    void manualTransferInRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.TRANSFER_IN, "2022-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("automatically"));
    }

    @Test
    void dismissalRequiresReason() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.DISMISSAL, "2020-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("reason"));
    }

    @Test
    void vacationOfPostRequiresReason() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.VACATION_OF_POST, "2020-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("reason"));
    }

    @Test
    void mismatchedServiceLevelRejected() {
        Designation accountant = designation(4L, serviceType(1L), primaryLevel);
        accountant.setDesignationName("Accountant");

        lenient().when(designationRepository.findById(4L))
                .thenReturn(Optional.of(accountant));

        CareerHistoryEventRequest appointment = appointment("2015-01-01", 4L);
        appointment.setServiceLevelId(20L);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(List.of(appointment))
        );
        assertTrue(exception.getMessage().contains("service level"));
    }

    @Test
    void firstAppointmentRequiresServiceLevel() {
        CareerHistoryEventRequest appointment = appointment("2015-01-01", 1L);
        appointment.setServiceLevelId(null);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(List.of(appointment))
        );
        assertTrue(exception.getMessage().contains("service level"));
    }

    @Test
    void permanentConfirmationBeforeThreeYearsRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2016-01-01")
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("probation"));
    }

    @Test
    void gradeTwoPromotionBeforeRequiredYearsRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2018-06-01", 2L, Grade.II)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("Grade II promotion"));
    }

    @Test
    void gradeOnePromotionBeforeRequiredYearsRejected() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2020-01-01", 2L, Grade.II),
                gradeUpdate("2022-01-01", Grade.I)
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(events)
        );
        assertTrue(exception.getMessage().contains("Grade I promotion"));
    }

    @Test
    void gradePromotionsAfterRequiredYearsPass() {
        List<CareerHistoryEventRequest> events = List.of(
                appointment("2015-01-01", 1L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2020-01-01", 2L, Grade.II),
                gradeUpdate("2024-01-01", Grade.I)
        );

        assertDoesNotThrow(() -> validator.validate(events));
    }

    @Test
    void nwpAppointmentRequiresRegisteredOffice() {
        CareerHistoryEventRequest appointment = appointment("2015-01-01", 1L);
        appointment.setOffice("Unknown Office");
        appointment.setDistrict("Kurunegala");

        org.mockito.Mockito.doThrow(new RuntimeException("not registered"))
                .when(officeService)
                .validateNwpWorkplace("Unknown Office", "Kurunegala");

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> validator.validate(List.of(appointment))
        );

        assertTrue(exception.getMessage().contains("not registered"));
    }

    private CareerHistoryEventRequest appointment(String date, Long designationId) {
        CareerHistoryEventRequest event =
                event(EmployeeActionType.NEW_APPOINTMENT, date);
        event.setDesignationId(designationId);
        event.setServiceLevelId(10L);
        return event;
    }

    private CareerHistoryEventRequest promotion(
            String date,
            Long designationId,
            Grade grade
    ) {
        CareerHistoryEventRequest event = event(EmployeeActionType.PROMOTION, date);
        event.setDesignationId(designationId);
        event.setGrade(grade);
        return event;
    }

    private CareerHistoryEventRequest gradeUpdate(String date, Grade grade) {
        CareerHistoryEventRequest event =
                event(EmployeeActionType.ASSIGNMENT_GRADE_UPDATE, date);
        event.setGrade(grade);
        return event;
    }

    private CareerHistoryEventRequest event(EmployeeActionType type, String date) {
        CareerHistoryEventRequest event = new CareerHistoryEventRequest();
        event.setActionType(type);
        event.setActionDate(LocalDate.parse(date));
        if (type != EmployeeActionType.TRANSFER_OUT) {
            event.setDepartment(DepartmentConstants.NWP_ENGINEERING);
            event.setOffice("Main Office");
            event.setDistrict("Kurunegala");
        }
        return event;
    }

    private ServiceType serviceType(Long id) {
        return serviceType(id, Grade.SUPRA);
    }

    private ServiceType serviceType(Long id, Grade... terminalGrades) {
        ServiceType serviceType = new ServiceType();
        serviceType.setId(id);
        EnumSet<Grade> allowedGrades = EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I
        );
        for (Grade terminalGrade : terminalGrades) {
            allowedGrades.add(terminalGrade);
        }
        serviceType.setAllowedGrades(allowedGrades);
        return serviceType;
    }

    private Designation designation(
            Long id,
            ServiceType service,
            ServiceLevel serviceLevel
    ) {
        Designation designation = new Designation();
        designation.setId(id);
        designation.setService(service);
        designation.setServiceLevel(serviceLevel);
        designation.setAllowedGrades(
                service != null && service.getAllowedGrades() != null
                        ? EnumSet.copyOf(service.getAllowedGrades())
                        : EnumSet.of(
                                Grade.III,
                                Grade.II,
                                Grade.I,
                                Grade.SUPRA
                        )
        );
        return designation;
    }

    private ServiceLevel serviceLevel(Long id, String levelName) {
        ServiceLevel serviceLevel = new ServiceLevel();
        serviceLevel.setId(id);
        serviceLevel.setLevelName(levelName);
        return serviceLevel;
    }
}
