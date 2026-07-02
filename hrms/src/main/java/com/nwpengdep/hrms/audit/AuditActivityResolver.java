package com.nwpengdep.hrms.audit;

import com.nwpengdep.hrms.dto.DismissalRequest;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.dto.LifecycleActionRequest;
import com.nwpengdep.hrms.dto.MakePermanentRequest;
import com.nwpengdep.hrms.dto.NewAppointmentRequest;
import com.nwpengdep.hrms.dto.OfficeChangeRequest;
import com.nwpengdep.hrms.dto.PromotionRequest;
import com.nwpengdep.hrms.dto.TrainingAppointmentRequest;
import com.nwpengdep.hrms.dto.TransferOutRequest;
import com.nwpengdep.hrms.dto.VacationOfPostRequest;
import com.nwpengdep.hrms.dto.VehiclePermitCollectionRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AuditActivityResolver {

    private final EmployeeRepository employeeRepository;

    public Optional<AuditActivityDetails> resolve(
            String controllerName,
            String methodName,
            AuditAction action,
            String entityType,
            String entityId,
            Object requestBody,
            Object result,
            Map<String, Object> oldValues
    ) {
        String method = methodName.toLowerCase();

        if ("EmployeeController".equals(controllerName)) {
            return resolveEmployeeController(action, method, entityId, requestBody, result);
        }
        if ("EmployeeActionController".equals(controllerName)) {
            return resolveEmployeeActionController(action, method, entityId, requestBody, oldValues);
        }

        return resolveGeneric(controllerName, method, action, entityType, entityId, result);
    }

    private Optional<AuditActivityDetails> resolveEmployeeController(
            AuditAction action,
            String method,
            String entityId,
            Object requestBody,
            Object result
    ) {
        Employee employee = result instanceof Employee ? (Employee) result : loadEmployee(entityId);

        return switch (method) {
            case "retireemployee" -> lifecycleActivity(
                    EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                    employee,
                    entityId,
                    requestBody
            );
            case "markdeath" -> lifecycleActivity(
                    EmployeeActionType.DEATH,
                    employee,
                    entityId,
                    requestBody
            );
            case "dismissemployee" -> dismissalActivity(employee, entityId, requestBody);
            case "vacatepostemployee" -> vacationOfPostActivity(employee, entityId, requestBody);
            case "transferout" -> lifecycleActivity(
                    EmployeeActionType.TRANSFER_OUT,
                    employee,
                    entityId,
                    requestBody,
                    "transferDate"
            );
            case "officechange" -> lifecycleActivity(
                    EmployeeActionType.OFFICE_CHANGE,
                    employee,
                    entityId,
                    requestBody,
                    "effectiveDate"
            );
            case "appointnewemployee" -> lifecycleActivity(
                    EmployeeActionType.NEW_APPOINTMENT,
                    employee,
                    entityId,
                    requestBody,
                    "appointmentDate"
            );
            case "graduatetrainingtopermanent" -> lifecycleActivity(
                    EmployeeActionType.NEW_APPOINTMENT,
                    employee,
                    entityId,
                    requestBody,
                    "appointmentDate"
            );
            case "reverttraininggraduation" -> simpleEmployeeActivity(
                    "Revert Training Appointment",
                    "TRAINING_REVERT",
                    employee,
                    entityId
            );
            case "promoteemployee" -> promotionActivity(employee, entityId, requestBody);
            case "makepermanent" -> lifecycleActivity(
                    EmployeeActionType.PERMANENT_CONFIRMATION,
                    employee,
                    entityId,
                    requestBody,
                    "confirmationDate"
            );
            case "recordvehiclepermitcollection" -> vehiclePermitActivity(
                    "Record Vehicle Permit Collection",
                    "VEHICLE_PERMIT_RECORD",
                    employee,
                    entityId,
                    requestBody
            );
            case "updatevehiclepermitcollection" -> vehiclePermitActivity(
                    "Update Vehicle Permit Collection",
                    "VEHICLE_PERMIT_UPDATE",
                    employee,
                    entityId,
                    requestBody
            );
            case "undovehiclepermitcollection" -> simpleEmployeeActivity(
                    "Undo Vehicle Permit Collection",
                    "VEHICLE_PERMIT_UNDO",
                    employee,
                    entityId
            );
            case "createemployee" -> simpleEmployeeActivity(
                    "New Employee Registration",
                    "NEW_EMPLOYEE",
                    employee,
                    entityId
            );
            case "updateemployee" -> simpleEmployeeActivity(
                    "Employee Profile Update",
                    "EMPLOYEE_PROFILE_UPDATE",
                    employee,
                    entityId
            );
            case "getemployeebyid" -> simpleEmployeeActivity(
                    "View Employee Profile",
                    "EMPLOYEE_PROFILE_VIEW",
                    employee,
                    entityId
            );
            case "uploademployeephoto" -> simpleEmployeeActivity(
                    "Upload Employee Photo",
                    "EMPLOYEE_PHOTO_UPLOAD",
                    employee,
                    entityId
            );
            case "deleteemployeephoto" -> simpleEmployeeActivity(
                    "Remove Employee Photo",
                    "EMPLOYEE_PHOTO_DELETE",
                    employee,
                    entityId
            );
            case "deleteemployee" -> simpleEmployeeActivity(
                    "Deactivate Employee",
                    "EMPLOYEE_DEACTIVATE",
                    employee,
                    entityId
            );
            case "deleteemployeepermanently" -> simpleEmployeeActivity(
                    "Permanently Delete Employee",
                    "EMPLOYEE_PERMANENT_DELETE",
                    employee,
                    entityId
            );
            default -> Optional.empty();
        };
    }

    private Optional<AuditActivityDetails> resolveEmployeeActionController(
            AuditAction action,
            String method,
            String entityId,
            Object requestBody,
            Map<String, Object> oldValues
    ) {
        String actionTypeCode = extractActionTypeCode(oldValues);
        String actionLabel = labelForActionType(actionTypeCode);

        if ("updateemployeeaction".equals(method)) {
            Map<String, Object> details = baseDetails(actionTypeCode, actionLabel);
            details.put("employeeActionId", entityId);
            putRequestFields(details, requestBody);

            return Optional.of(AuditActivityDetails.builder()
                    .activityType(actionTypeCode)
                    .activitySummary("Edit Career History — " + actionLabel)
                    .entityLabel(buildActionEntityLabel(actionLabel, oldValues))
                    .details(details)
                    .build());
        }

        if ("deleteemployeeaction".equals(method)) {
            Map<String, Object> details = baseDetails(actionTypeCode, actionLabel);
            details.put("employeeActionId", entityId);
            copyIfPresent(oldValues, details, "actionDate", "reason", "remarks");

            return Optional.of(AuditActivityDetails.builder()
                    .activityType(actionTypeCode)
                    .activitySummary("Delete Career History — " + actionLabel)
                    .entityLabel(buildActionEntityLabel(actionLabel, oldValues))
                    .details(details)
                    .build());
        }

        return Optional.empty();
    }

    private Optional<AuditActivityDetails> resolveGeneric(
            String controllerName,
            String method,
            AuditAction action,
            String entityType,
            String entityId,
            Object result
    ) {
        String summary = switch (controllerName) {
            case "DesignationController" -> masterDataSummary(action, "Designation");
            case "ServiceTypeController" -> masterDataSummary(action, "Service");
            case "OfficeController" -> masterDataSummary(action, "Office");
            case "ServiceLevelController" -> masterDataSummary(action, "Service Level");
            case "CadrePositionController" -> masterDataSummary(action, "Cadre Position");
            case "CadreReportController" -> "Generate Cadre Report";
            case "AllEmployeeDetailsReportController" -> method.contains("export")
                    ? "Export All Employee Details Report"
                    : "View All Employee Details Report";
            default -> null;
        };

        if (summary == null) {
            return Optional.empty();
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("activitySummary", summary);
        if (entityId != null) {
            details.put("resourceId", entityId);
        }

        return Optional.of(AuditActivityDetails.builder()
                .activitySummary(summary)
                .activityType(entityType)
                .entityLabel(summary + (entityId != null ? " #" + entityId : ""))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> lifecycleActivity(
            EmployeeActionType actionType,
            Employee employee,
            String entityId,
            Object requestBody
    ) {
        return lifecycleActivity(actionType, employee, entityId, requestBody, "actionDate");
    }

    private Optional<AuditActivityDetails> lifecycleActivity(
            EmployeeActionType actionType,
            Employee employee,
            String entityId,
            Object requestBody,
            String dateFieldName
    ) {
        String label = labelForActionType(actionType.name());
        Map<String, Object> details = baseDetails(actionType.name(), label);
        addEmployee(details, employee, entityId);
        putRequestFields(details, requestBody);

        LocalDate effectiveDate = extractDate(requestBody, dateFieldName);
        if (effectiveDate == null) {
            effectiveDate = extractDate(requestBody, "actionDate");
        }
        if (effectiveDate != null) {
            details.put("effectiveDate", effectiveDate.toString());
        }

        return Optional.of(AuditActivityDetails.builder()
                .activityType(actionType.name())
                .activitySummary(label)
                .entityLabel(buildEmployeeEntityLabel(label, employee))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> dismissalActivity(
            Employee employee,
            String entityId,
            Object requestBody
    ) {
        String label = labelForActionType(EmployeeActionType.DISMISSAL.name());
        Map<String, Object> details = baseDetails(EmployeeActionType.DISMISSAL.name(), label);
        addEmployee(details, employee, entityId);

        if (requestBody instanceof DismissalRequest request) {
            if (request.getActionDate() != null) {
                details.put("effectiveDate", request.getActionDate().toString());
                details.put("actionDate", request.getActionDate().toString());
            }
            if (request.getReason() != null) {
                details.put("reason", request.getReason());
            }
            if (request.getRemarks() != null) {
                details.put("remarks", request.getRemarks());
            }
        }

        return Optional.of(AuditActivityDetails.builder()
                .activityType(EmployeeActionType.DISMISSAL.name())
                .activitySummary(label)
                .entityLabel(buildEmployeeEntityLabel(label, employee))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> vacationOfPostActivity(
            Employee employee,
            String entityId,
            Object requestBody
    ) {
        String label = labelForActionType(EmployeeActionType.VACATION_OF_POST.name());
        Map<String, Object> details = baseDetails(EmployeeActionType.VACATION_OF_POST.name(), label);
        addEmployee(details, employee, entityId);

        if (requestBody instanceof VacationOfPostRequest request) {
            if (request.getActionDate() != null) {
                details.put("effectiveDate", request.getActionDate().toString());
                details.put("actionDate", request.getActionDate().toString());
            }
            if (request.getReason() != null) {
                details.put("reason", request.getReason());
            }
            if (request.getRemarks() != null) {
                details.put("remarks", request.getRemarks());
            }
        }

        return Optional.of(AuditActivityDetails.builder()
                .activityType(EmployeeActionType.VACATION_OF_POST.name())
                .activitySummary(label)
                .entityLabel(buildEmployeeEntityLabel(label, employee))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> promotionActivity(
            Employee employee,
            String entityId,
            Object requestBody
    ) {
        String label = "Promotion / Grade Update";
        Map<String, Object> details = baseDetails(EmployeeActionType.PROMOTION.name(), label);
        addEmployee(details, employee, entityId);
        putRequestFields(details, requestBody);

        if (requestBody instanceof PromotionRequest request && request.getPromotionDate() != null) {
            details.put("effectiveDate", request.getPromotionDate().toString());
        }

        return Optional.of(AuditActivityDetails.builder()
                .activityType(EmployeeActionType.PROMOTION.name())
                .activitySummary(label)
                .entityLabel(buildEmployeeEntityLabel(label, employee))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> vehiclePermitActivity(
            String summary,
            String activityType,
            Employee employee,
            String entityId,
            Object requestBody
    ) {
        Map<String, Object> details = baseDetails(activityType, summary);
        addEmployee(details, employee, entityId);

        if (requestBody instanceof VehiclePermitCollectionRequest request
                && request.getCollectedDate() != null) {
            details.put("collectedDate", request.getCollectedDate().toString());
            details.put("effectiveDate", request.getCollectedDate().toString());
        }

        return Optional.of(AuditActivityDetails.builder()
                .activityType(activityType)
                .activitySummary(summary)
                .entityLabel(buildEmployeeEntityLabel(summary, employee))
                .details(details)
                .build());
    }

    private Optional<AuditActivityDetails> simpleEmployeeActivity(
            String summary,
            String activityType,
            Employee employee,
            String entityId
    ) {
        Map<String, Object> details = baseDetails(activityType, summary);
        addEmployee(details, employee, entityId);

        return Optional.of(AuditActivityDetails.builder()
                .activityType(activityType)
                .activitySummary(summary)
                .entityLabel(buildEmployeeEntityLabel(summary, employee))
                .details(details)
                .build());
    }

    private Map<String, Object> baseDetails(String activityType, String activitySummary) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("activityType", activityType);
        details.put("activitySummary", activitySummary);
        return details;
    }

    private void addEmployee(Map<String, Object> details, Employee employee, String entityId) {
        if (employee != null) {
            details.put("employeeId", employee.getId());
            details.put("employeeName", employee.getFullName());
            details.put("employeeNic", employee.getNic());
            if (employee.getStatus() != null) {
                details.put("employeeStatus", employee.getStatus().name());
            }
            return;
        }
        if (entityId != null) {
            details.put("employeeId", entityId);
        }
    }

    private void putRequestFields(Map<String, Object> details, Object requestBody) {
        if (requestBody instanceof LifecycleActionRequest request) {
            putDate(details, request.getActionDate());
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof DismissalRequest request) {
            putDate(details, request.getActionDate());
            putIfPresent(details, "reason", request.getReason());
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof TransferOutRequest request) {
            if (request.getTransferDate() != null) {
                details.put("transferDate", request.getTransferDate().toString());
                details.put("effectiveDate", request.getTransferDate().toString());
            }
            putIfPresent(details, "toDepartment", request.getToDepartment());
            putIfPresent(details, "toOffice", request.getToOffice());
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof OfficeChangeRequest request) {
            if (request.getEffectiveDate() != null) {
                details.put("effectiveDate", request.getEffectiveDate().toString());
            }
            putIfPresent(details, "office", request.getOffice());
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof NewAppointmentRequest request) {
            if (request.getAppointmentDate() != null) {
                details.put("appointmentDate", request.getAppointmentDate().toString());
                details.put("effectiveDate", request.getAppointmentDate().toString());
            }
            putIfPresent(details, "department", request.getDepartment());
            putIfPresent(details, "office", request.getOffice());
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof TrainingAppointmentRequest request) {
            if (request.getAppointmentDate() != null) {
                details.put("appointmentDate", request.getAppointmentDate().toString());
                details.put("effectiveDate", request.getAppointmentDate().toString());
            }
            putIfPresent(details, "department", request.getDepartment());
            putIfPresent(details, "office", request.getOffice());
            putIfPresent(details, "remarks", request.getRemarks());
            if (request.getServiceLevelId() != null) {
                details.put("serviceLevelId", request.getServiceLevelId());
            }
        } else if (requestBody instanceof MakePermanentRequest request) {
            if (request.getConfirmationDate() != null) {
                details.put("confirmationDate", request.getConfirmationDate().toString());
                details.put("effectiveDate", request.getConfirmationDate().toString());
            }
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof PromotionRequest request) {
            if (request.getPromotionDate() != null) {
                details.put("promotionDate", request.getPromotionDate().toString());
            }
            if (request.getGrade() != null) {
                details.put("grade", request.getGrade().name());
            }
            putIfPresent(details, "remarks", request.getRemarks());
        } else if (requestBody instanceof EmployeeActionUpdateRequest request) {
            putDate(details, request.getActionDate());
            putIfPresent(details, "reason", request.getReason());
            putIfPresent(details, "remarks", request.getRemarks());
            putIfPresent(details, "department", request.getDepartment());
            putIfPresent(details, "office", request.getOffice());
            if (request.getGrade() != null) {
                details.put("grade", request.getGrade());
            }
        }
    }

    private LocalDate extractDate(Object requestBody, String fieldName) {
        if (requestBody instanceof LifecycleActionRequest request && "actionDate".equals(fieldName)) {
            return request.getActionDate();
        }
        if (requestBody instanceof OfficeChangeRequest request && "effectiveDate".equals(fieldName)) {
            return request.getEffectiveDate();
        }
        if (requestBody instanceof NewAppointmentRequest request && "appointmentDate".equals(fieldName)) {
            return request.getAppointmentDate();
        }
        if (requestBody instanceof TrainingAppointmentRequest request
                && "appointmentDate".equals(fieldName)) {
            return request.getAppointmentDate();
        }
        if (requestBody instanceof TransferOutRequest request && "transferDate".equals(fieldName)) {
            return request.getTransferDate();
        }
        if (requestBody instanceof MakePermanentRequest request && "confirmationDate".equals(fieldName)) {
            return request.getConfirmationDate();
        }
        return null;
    }

    private String buildEmployeeEntityLabel(String activitySummary, Employee employee) {
        if (employee == null) {
            return activitySummary;
        }
        return activitySummary + " — " + employee.getFullName()
                + (employee.getNic() != null ? " (" + employee.getNic() + ")" : "");
    }

    private String buildActionEntityLabel(String actionLabel, Map<String, Object> oldValues) {
        if (oldValues == null) {
            return actionLabel;
        }
        Object employee = oldValues.get("employee");
        if (employee instanceof Map<?, ?> employeeMap) {
            Object name = employeeMap.get("fullName");
            Object nic = employeeMap.get("nic");
            if (name != null) {
                return actionLabel + " — " + name + (nic != null ? " (" + nic + ")" : "");
            }
        }
        return actionLabel;
    }

    private String extractActionTypeCode(Map<String, Object> oldValues) {
        if (oldValues == null || oldValues.get("actionType") == null) {
            return "EMPLOYEE_ACTION";
        }
        return String.valueOf(oldValues.get("actionType"));
    }

    private String labelForActionType(String actionTypeCode) {
        if (actionTypeCode == null) {
            return "Employee Action";
        }
        return switch (actionTypeCode) {
            case "NEW_APPOINTMENT" -> "New Appointment";
            case "TRANSFER_IN" -> "Transfer In";
            case "TRANSFER_OUT" -> "Transfer Out";
            case "PROMOTION" -> "Promotion";
            case "ASSIGNMENT_GRADE_UPDATE" -> "Assignment / Grade Update";
            case "PERMANENT_CONFIRMATION" -> "Permanent Confirmation";
            case "OFFICE_CHANGE" -> "Office Change";
            case "RETIREMENT_OR_RESIGNATION" -> "Retirement / Resignation";
            case "DEATH" -> "Death";
            case "DISMISSAL" -> "Dismissal";
            case "VACATION_OF_POST" -> "Vacation of Post";
            default -> actionTypeCode.replace('_', ' ');
        };
    }

    private String masterDataSummary(AuditAction action, String resourceLabel) {
        return switch (action) {
            case CREATE -> "Create " + resourceLabel;
            case UPDATE -> "Update " + resourceLabel;
            case DELETE -> "Delete " + resourceLabel;
            default -> resourceLabel + " Change";
        };
    }

    private void putDate(Map<String, Object> details, LocalDate date) {
        if (date != null) {
            details.put("actionDate", date.toString());
            details.put("effectiveDate", date.toString());
        }
    }

    private void putIfPresent(Map<String, Object> details, String key, Object value) {
        if (value != null && !String.valueOf(value).isBlank()) {
            details.put(key, value);
        }
    }

    private void copyIfPresent(
            Map<String, Object> source,
            Map<String, Object> target,
            String... keys
    ) {
        if (source == null) {
            return;
        }
        for (String key : keys) {
            if (source.containsKey(key) && source.get(key) != null) {
                target.put(key, source.get(key));
            }
        }
    }

    private Employee loadEmployee(String entityId) {
        if (entityId == null) {
            return null;
        }
        try {
            return employeeRepository.findById(Long.parseLong(entityId)).orElse(null);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
