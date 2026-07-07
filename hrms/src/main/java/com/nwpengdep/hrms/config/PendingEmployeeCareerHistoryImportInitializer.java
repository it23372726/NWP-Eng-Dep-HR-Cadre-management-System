package com.nwpengdep.hrms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.dto.EmployeeChildRequest;
import com.nwpengdep.hrms.dto.EmployeeSpouseRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.service.EmployeeService;
import com.nwpengdep.hrms.util.EmployeePendingUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class PendingEmployeeCareerHistoryImportInitializer {

    private static final String CAREER_HISTORY_RESOURCE =
            "import/pending-employee-career-history.json";

    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final DesignationRepository designationRepository;

    @Value("${hrms.bootstrap.pending-employee-career-history.enabled:true}")
    private boolean bootstrapEnabled;

    @Order(102)
    @EventListener(ApplicationReadyEvent.class)
    public void importPendingEmployeeCareerHistory() {
        if (!bootstrapEnabled) {
            return;
        }

        Set<String> allowedEmployeeNos = PendingEmployeeImportSupport.loadAllowedEmployeeNos();
        List<CareerHistoryImportRow> rows = loadCareerHistoryRows(allowedEmployeeNos);

        int imported = 0;
        int skipped = 0;
        int failed = 0;

        for (CareerHistoryImportRow row : rows) {
            try {
                ImportResult result = importCareerHistoryForEmployee(row);
                switch (result) {
                    case IMPORTED -> imported++;
                    case SKIPPED -> skipped++;
                    case FAILED -> failed++;
                }
            } catch (RuntimeException ex) {
                log.error(
                        "Failed to import career history for employee {}: {}",
                        row.employeeNo(),
                        ex.getMessage()
                );
                failed++;
            }
        }

        log.info(
                "Pending employee career history import finished: imported={}, skipped={}, failed={}",
                imported,
                skipped,
                failed
        );
    }

    private List<CareerHistoryImportRow> loadCareerHistoryRows(Set<String> allowedEmployeeNos) {
        List<CareerHistoryImportRow> rows = PendingEmployeeImportSupport.loadResource(
                CAREER_HISTORY_RESOURCE,
                new TypeReference<List<CareerHistoryImportRow>>() {}
        );

        List<CareerHistoryImportRow> filtered = new ArrayList<>();
        for (CareerHistoryImportRow row : rows) {
            if (row.employeeNo() == null || row.employeeNo().isBlank()) {
                continue;
            }
            String employeeNo = row.employeeNo().trim();
            if (!allowedEmployeeNos.contains(employeeNo)) {
                log.info(
                        "Ignored career history import for employee {} (not in pending-employees.json)",
                        employeeNo
                );
                continue;
            }
            filtered.add(row);
        }
        return filtered;
    }

    private ImportResult importCareerHistoryForEmployee(CareerHistoryImportRow row) {
        String employeeNo = row.employeeNo().trim();

        Employee employee = employeeRepository.findByEmployeeNo(employeeNo)
                .orElse(null);
        if (employee == null) {
            log.info(
                    "Skipped career history import (employee not found): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        boolean needsPermanentConfirmationRepair =
                needsPermanentConfirmationRepair(employee, row);

        if (!needsPermanentConfirmationRepair && !isSystemPendingEmployee(employee)) {
            log.info(
                    "Skipped career history import (employee is not system pending): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        if (!needsPermanentConfirmationRepair && careerHistoryAlreadySeeded(employee)) {
            log.info(
                    "Skipped career history import (already seeded): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        if (needsPermanentConfirmationRepair) {
            log.info(
                    "Repairing incomplete permanent confirmation for employee: {}",
                    employeeNo
            );
        }

        if (row.events() == null || row.events().isEmpty()) {
            log.info(
                    "Skipped career history import (no events): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        Designation designation = resolveDesignation(row);
        List<CareerHistoryEventRequest> events = mapEvents(
                row.events(),
                designation
        );

        EmployeeUpdateRequest request = buildPendingUpdateRequest(
                employee,
                designation.getServiceLevel().getId(),
                events
        );
        employeeService.updateEmployee(employee.getId(), request);
        log.info(
                "{} career history for pending employee: {} ({})",
                needsPermanentConfirmationRepair ? "Repaired" : "Imported",
                employee.getEmployeeNo(),
                employee.getFullName()
        );
        return ImportResult.IMPORTED;
    }

    private Designation resolveDesignation(CareerHistoryImportRow row) {
        String designationName = trimToNull(row.designationName());
        String serviceCode = trimToNull(row.serviceCode());
        String serviceLevelName = trimToNull(row.serviceLevelName());

        if (designationName == null || serviceCode == null || serviceLevelName == null) {
            throw new RuntimeException(
                    "Career history import row for employee "
                            + row.employeeNo()
                            + " must include designationName, serviceCode, and serviceLevelName"
            );
        }

        return designationRepository
                .findByDesignationNameIgnoreCaseAndService_ServiceCodeIgnoreCaseAndServiceLevel_LevelNameIgnoreCase(
                        designationName,
                        serviceCode,
                        serviceLevelName
                )
                .orElseThrow(() -> new RuntimeException(
                        "Designation not found: "
                                + designationName
                                + " / "
                                + serviceCode
                                + " / "
                                + serviceLevelName
                ));
    }

    private List<CareerHistoryEventRequest> mapEvents(
            List<CareerHistoryEventImportRow> importEvents,
            Designation designation
    ) {
        List<CareerHistoryEventRequest> events = new ArrayList<>();
        for (CareerHistoryEventImportRow importEvent : importEvents) {
            if (importEvent == null) {
                continue;
            }

            CareerHistoryEventRequest event = new CareerHistoryEventRequest();
            event.setActionType(parseActionType(importEvent.actionType()));
            event.setActionDate(importEvent.actionDate());
            event.setGrade(parseGrade(importEvent.grade()));
            event.setDepartment(trimToNull(importEvent.department()));
            event.setOffice(trimToNull(importEvent.office()));
            event.setDistrict(parseDistrict(importEvent.district()));
            event.setRemarks(trimToNull(importEvent.remarks()));

            if (event.getActionType() == EmployeeActionType.NEW_APPOINTMENT) {
                event.setDesignationId(designation.getId());
                event.setServiceLevelId(designation.getServiceLevel().getId());
            }

            events.add(event);
        }

        if (events.isEmpty()) {
            throw new RuntimeException("Career history import row has no valid events");
        }

        return events;
    }

    private EmployeeUpdateRequest buildPendingUpdateRequest(
            Employee employee,
            Long serviceLevelId,
            List<CareerHistoryEventRequest> careerHistory
    ) {
        EmployeeUpdateRequest request = new EmployeeUpdateRequest();
        request.setEmployeeNo(employee.getEmployeeNo());
        request.setFullName(employee.getFullName());
        request.setNic(employee.getNic());
        request.setTin(employee.getTin());
        request.setDateOfBirth(employee.getDateOfBirth());
        request.setGender(employee.getGender());
        request.setMaritalStatus(employee.getMaritalStatus());
        request.setEmploymentType(employee.getEmploymentType());
        request.setPermanentAddress(employee.getPermanentAddress());
        request.setResidentDistrict(employee.getResidentDistrict());
        request.setContactNo(employee.getContactNo());
        request.setEmailAddress(employee.getEmailAddress());
        request.setEnteredDateToAllIslandService(employee.getEnteredDateToAllIslandService());
        request.setIncremantDate(employee.getIncremantDate());
        request.setWidowsOrphansPensionNo(employee.getWidowsOrphansPensionNo());
        request.setServiceLevelId(serviceLevelId);
        request.setCareerHistory(careerHistory);
        LocalDate permanentConfirmationDate = findPermanentConfirmationDate(careerHistory);
        if (permanentConfirmationDate != null) {
            request.setAlreadyConfirmedPermanent(true);
            request.setPermanentConfirmationDate(permanentConfirmationDate);
        }
        request.setSpouse(mapExistingSpouse(employee.getSpouse()));
        request.setChildren(mapExistingChildren(employee.getChildren()));
        return request;
    }

    private LocalDate findPermanentConfirmationDate(
            List<CareerHistoryEventRequest> careerHistory
    ) {
        return careerHistory.stream()
                .filter(event -> event.getActionType()
                        == EmployeeActionType.PERMANENT_CONFIRMATION)
                .map(CareerHistoryEventRequest::getActionDate)
                .findFirst()
                .orElse(null);
    }

    private boolean needsPermanentConfirmationRepair(
            Employee employee,
            CareerHistoryImportRow row
    ) {
        if (!hasPermanentConfirmationImportEvent(row)) {
            return false;
        }
        return !isFullyPermanent(employee);
    }

    private boolean hasPermanentConfirmationImportEvent(CareerHistoryImportRow row) {
        if (row.events() == null || row.events().isEmpty()) {
            return false;
        }
        return row.events().stream()
                .anyMatch(event -> event != null
                        && EmployeeActionType.PERMANENT_CONFIRMATION.name()
                                .equals(trimToNull(event.actionType())));
    }

    private boolean isFullyPermanent(Employee employee) {
        if (employee.getPermanentStatus() != PermanentStatus.PERMANENT) {
            return false;
        }
        EmployeeCareerProgression careerProgression = employee.getCareerProgression();
        return careerProgression != null
                && careerProgression.getPermanentConfirmationDate() != null;
    }

    private EmployeeSpouseRequest mapExistingSpouse(EmployeeSpouse spouse) {
        if (spouse == null) {
            return null;
        }

        EmployeeSpouseRequest request = new EmployeeSpouseRequest();
        request.setNic(spouse.getNic());
        request.setFullName(spouse.getFullName());
        request.setDateOfBirth(spouse.getDateOfBirth());
        return request;
    }

    private List<EmployeeChildRequest> mapExistingChildren(List<EmployeeChild> children) {
        if (children == null || children.isEmpty()) {
            return List.of();
        }

        List<EmployeeChildRequest> mapped = new ArrayList<>();
        for (EmployeeChild child : children) {
            EmployeeChildRequest request = new EmployeeChildRequest();
            request.setNic(child.getNic());
            request.setBirthCertificateNo(child.getBirthCertificateNo());
            request.setFullName(child.getFullName());
            request.setDateOfBirth(child.getDateOfBirth());
            request.setRelationship(child.getRelationship());
            mapped.add(request);
        }
        return mapped;
    }

    private boolean careerHistoryAlreadySeeded(Employee employee) {
        return employee.getDateOfFirstAppointment() != null
                || employeeActionRepository.existsActiveActionsByEmployeeId(employee.getId());
    }

    private boolean isSystemPendingEmployee(Employee employee) {
        return EmployeePendingUtil.isSystemPending(
                employee,
                employeeActionRepository.existsActiveActionsByEmployeeId(employee.getId())
        );
    }

    private EmployeeActionType parseActionType(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            throw new RuntimeException("Career history event actionType is required");
        }
        try {
            return EmployeeActionType.valueOf(actionType.trim());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException("Invalid career history actionType: " + actionType);
        }
    }

    private Grade parseGrade(String grade) {
        if (grade == null || grade.isBlank()) {
            return Grade.III;
        }
        try {
            return Grade.valueOf(grade.trim());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException("Invalid grade: " + grade);
        }
    }

    private District parseDistrict(String district) {
        if (district == null || district.isBlank()) {
            return null;
        }
        return District.fromLabel(district.trim());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private enum ImportResult {
        IMPORTED,
        SKIPPED,
        FAILED
    }

    private record CareerHistoryImportRow(
            String employeeNo,
            String designationName,
            String serviceCode,
            String serviceLevelName,
            List<CareerHistoryEventImportRow> events
    ) {
    }

    private record CareerHistoryEventImportRow(
            String actionType,
            LocalDate actionDate,
            String grade,
            String department,
            String office,
            String district,
            String remarks
    ) {
    }
}
