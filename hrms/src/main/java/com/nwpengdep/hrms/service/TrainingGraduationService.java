package com.nwpengdep.hrms.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.TrainingRevertSnapshot;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceLevelRepository;
import com.nwpengdep.hrms.util.EmployeeTrainingUtil;
import com.nwpengdep.hrms.util.TrainingGraduationRequirements;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TrainingGraduationService {

    private static final ObjectMapper OBJECT_MAPPER = createObjectMapper();

    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelRepository serviceLevelRepository;
    private final CurrentUserService currentUserService;
    private final EmployeeRequirementSyncService requirementSyncService;

    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

    public boolean canRevertTrainingGraduation(Employee employee) {
        if (employee == null || !Boolean.TRUE.equals(employee.getTrainingOrigin())) {
            return false;
        }
        if (EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return false;
        }

        TrainingRevertSnapshot snapshot = readSnapshot(employee);
        if (snapshot == null || snapshot.graduationActionId() == null) {
            return false;
        }

        EmployeeAction graduationAction = employeeActionRepository
                .findById(snapshot.graduationActionId())
                .orElse(null);
        if (graduationAction == null
                || Boolean.TRUE.equals(graduationAction.getDeleted())
                || !Boolean.TRUE.equals(graduationAction.getTrainingGraduation())) {
            return false;
        }

        return !hasActionsAfterGraduation(employee.getId(), graduationAction);
    }

    public void populateLifecycleFlags(Employee employee) {
        employee.setCanRevertTrainingGraduation(
                canRevertTrainingGraduation(employee)
        );
        employee.setCanAppointAsPermanent(
                EmployeeTrainingUtil.isTrainingEmployee(employee)
                        && TrainingGraduationRequirements.areSatisfied(employee)
        );
    }

    public TrainingRevertSnapshot captureSnapshot(Employee employee) {
        ServiceLevel serviceLevel = employee.getServiceLevel();
        return new TrainingRevertSnapshot(
                null,
                serviceLevel != null ? serviceLevel.getId() : null,
                employee.getGrade(),
                employee.getDateOfFirstAppointment(),
                employee.getAppointmentDateToPresentClassGrade()
        );
    }

    public void storeSnapshot(
            Employee employee,
            TrainingRevertSnapshot snapshot
    ) {
        employee.ensureTrainingProfile().setTrainingRevertSnapshot(serializeSnapshot(snapshot));
    }

    public void attachGraduationAction(
            Employee employee,
            EmployeeAction graduationAction,
            TrainingRevertSnapshot snapshot
    ) {
        TrainingRevertSnapshot stored = new TrainingRevertSnapshot(
                graduationAction.getId(),
                snapshot.serviceLevelId(),
                snapshot.grade(),
                snapshot.dateOfFirstAppointment(),
                snapshot.appointmentDateToPresentClassGrade()
        );
        storeSnapshot(employee, stored);
        employeeRepository.save(employee);
    }

    @Transactional
    public Employee revertTrainingGraduation(Long employeeId) {
        return revertTrainingGraduation(employeeId, null);
    }

    @Transactional
    public Employee revertTrainingGraduation(Long employeeId, Long graduationActionId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (graduationActionId != null) {
            return revertTrainingGraduationByAction(employee, graduationActionId);
        }

        if (!canRevertTrainingGraduation(employee)) {
            throw new RuntimeException(
                    "This employee cannot be reverted to training status"
            );
        }

        TrainingRevertSnapshot snapshot = readSnapshot(employee);
        EmployeeAction graduationAction = employeeActionRepository
                .findById(snapshot.graduationActionId())
                .orElseThrow(() ->
                        new RuntimeException("Training graduation action not found")
                );

        return performRevert(employee, graduationAction, snapshot);
    }

    private Employee revertTrainingGraduationByAction(
            Employee employee,
            Long graduationActionId
    ) {
        EmployeeAction graduationAction = employeeActionRepository
                .findById(graduationActionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (!employee.getId().equals(graduationAction.getEmployee().getId())) {
            throw new RuntimeException("Action does not belong to this employee");
        }
        if (!Boolean.TRUE.equals(graduationAction.getTrainingGraduation())) {
            throw new RuntimeException(
                    "This action is not a training graduation appointment"
            );
        }
        if (Boolean.TRUE.equals(graduationAction.getDeleted())) {
            throw new RuntimeException("This lifecycle action has already been deleted");
        }
        if (!Boolean.TRUE.equals(employee.getTrainingOrigin())) {
            throw new RuntimeException(
                    "This employee cannot be reverted to training status"
            );
        }
        if (EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            throw new RuntimeException("Employee is already in training status");
        }

        TrainingRevertSnapshot snapshot = readSnapshot(employee);
        if (snapshot == null
                || snapshot.graduationActionId() == null
                || !snapshot.graduationActionId().equals(graduationActionId)) {
            throw new RuntimeException(
                    "This action is not the recorded training graduation appointment"
            );
        }
        if (hasActionsAfterGraduation(employee.getId(), graduationAction)) {
            throw new RuntimeException(
                    "Cannot revert because later lifecycle actions exist after "
                            + "the permanent appointment"
            );
        }

        return performRevert(employee, graduationAction, snapshot);
    }

    private Employee performRevert(
            Employee employee,
            EmployeeAction graduationAction,
            TrainingRevertSnapshot snapshot
    ) {
        graduationAction.setDeleted(true);
        graduationAction.setDeletedBy(
                currentUserService.getCurrentUsernameOrDefault("system")
        );
        graduationAction.setDeletedAt(LocalDateTime.now());
        employeeActionRepository.save(graduationAction);

        applyTrainingState(employee, snapshot);
        restoreWorkplaceFromTraineeAppointment(employee);
        employee.ensureTrainingProfile().setTrainingRevertSnapshot(null);
        employee.setCanRevertTrainingGraduation(false);
        requirementSyncService.syncTrainingEmployeeRequirements(employee);
        populateLifecycleFlags(employee);

        return employeeRepository.save(employee);
    }

    private void applyTrainingState(
            Employee employee,
            TrainingRevertSnapshot snapshot
    ) {
        ServiceLevel serviceLevel = serviceLevelRepository
                .findById(snapshot.serviceLevelId())
                .orElseThrow(() ->
                        new RuntimeException("Training service level not found")
                );
        if (!EmployeeTrainingUtil.isTrainingServiceLevel(serviceLevel)) {
            throw new RuntimeException(
                    "Stored training snapshot does not reference a training service level"
            );
        }

        employee.setEmploymentType(null);
        employee.setPermanentStatus(null);
        employee.setService(null);
        employee.setServiceLevel(serviceLevel);
        employee.setGrade(snapshot.grade() != null ? snapshot.grade() : Grade.NONE);
        employee.setDateOfFirstAppointment(snapshot.dateOfFirstAppointment());
        employee.setAppointmentDateToPresentClassGrade(
                snapshot.appointmentDateToPresentClassGrade()
        );

        EmployeeCareerProgression progression = employee.getCareerProgression();
        if (progression != null) {
            progression.setQualifiedForPermanent(false);
            progression.setPermanentQualificationDate(null);
            progression.setPermanentConfirmationDate(null);
            progression.setGrade3AchievedDate(null);
            progression.setGrade2EligibilityDate(null);
            progression.setGrade1EligibilityDate(null);
            progression.setQualifiedForGrade2(false);
            progression.setQualifiedForGrade1(false);
        }

        if (employee.getRequirements() != null) {
            employee.getRequirements().clear();
        }

        postingRepository.deleteByEmployeeId(employee.getId());
        if (employee.getDesignation() != null) {
            LocalDate postingStart = employee.getReportedDateToPresentWorkingPlace();
            EmployeePosting posting = EmployeePosting.builder()
                    .employee(employee)
                    .designation(employee.getDesignation())
                    .startDate(postingStart)
                    .currentPosting(true)
                    .build();
            postingRepository.save(posting);
        }
    }

    private void restoreWorkplaceFromTraineeAppointment(Employee employee) {
        activeActions(employee.getId()).stream()
                .filter(action -> action.getActionType() == EmployeeActionType.NEW_APPOINTMENT
                        && Boolean.TRUE.equals(action.getTrainingAppointment()))
                .findFirst()
                .ifPresent(action -> {
                    if (action.getNewDesignation() != null) {
                        employee.setDesignation(action.getNewDesignation());
                    }
                    if (action.getDepartment() != null) {
                        employee.setCurrentDepartment(action.getDepartment());
                        employee.setCurrentOffice(action.getOffice());
                        employee.setCurrentDistrictOfWorking(action.getDistrict());
                        employee.setCurrentWorkingPlace(
                                formatWorkingPlace(action.getDepartment(), action.getOffice())
                        );
                    }
                    employee.setReportedDateToPresentWorkingPlace(action.getActionDate());
                });
    }

    private String formatWorkingPlace(String department, String office) {
        if (department == null || department.isBlank()) {
            return office;
        }
        if (office == null || office.isBlank()) {
            return DepartmentConstants.normalize(department);
        }
        return DepartmentConstants.normalize(department) + " - " + office.trim();
    }

    private boolean hasActionsAfterGraduation(
            Long employeeId,
            EmployeeAction graduationAction
    ) {
        List<EmployeeAction> actions = activeActions(employeeId);
        return actions.stream()
                .filter(action -> !action.getId().equals(graduationAction.getId()))
                .anyMatch(action -> isAfter(action, graduationAction));
    }

    private boolean isAfter(EmployeeAction action, EmployeeAction graduationAction) {
        int dateCompare = action.getActionDate()
                .compareTo(graduationAction.getActionDate());
        if (dateCompare > 0) {
            return true;
        }
        return dateCompare == 0
                && action.getId() > graduationAction.getId();
    }

    private List<EmployeeAction> activeActions(Long employeeId) {
        return employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .sorted(Comparator.comparing(EmployeeAction::getActionDate)
                        .thenComparing(EmployeeAction::getId))
                .toList();
    }

    private TrainingRevertSnapshot readSnapshot(Employee employee) {
        if (employee.getTrainingRevertSnapshot() == null
                || employee.getTrainingRevertSnapshot().isBlank()) {
            return null;
        }

        try {
            return OBJECT_MAPPER.readValue(
                    employee.getTrainingRevertSnapshot(),
                    TrainingRevertSnapshot.class
            );
        } catch (JsonProcessingException exception) {
            throw new RuntimeException(
                    "Stored training revert snapshot is invalid",
                    exception
            );
        }
    }

    private String serializeSnapshot(TrainingRevertSnapshot snapshot) {
        try {
            return OBJECT_MAPPER.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new RuntimeException(
                    "Unable to store training revert snapshot",
                    exception
            );
        }
    }
}
