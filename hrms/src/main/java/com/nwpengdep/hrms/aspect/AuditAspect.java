package com.nwpengdep.hrms.aspect;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditActivityDetails;
import com.nwpengdep.hrms.audit.AuditActivityResolver;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import com.nwpengdep.hrms.audit.AuditDiffUtil;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.service.AuditEntitySnapshotService;
import com.nwpengdep.hrms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogService auditLogService;
    private final AuditDiffUtil auditDiffUtil;
    private final AuditEntitySnapshotService auditEntitySnapshotService;
    private final AuditActivityResolver auditActivityResolver;

    @Around("within(@org.springframework.web.bind.annotation.RestController *) "
            + "&& !within(com.nwpengdep.hrms.controller.AuditLogController) "
            + "&& !within(com.nwpengdep.hrms.controller.AuthController) "
            + "&& !within(com.nwpengdep.hrms.controller.UserController) "
            + "&& !within(com.nwpengdep.hrms.controller.TestController)")
    public Object auditControllerCall(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String entityType = resolveEntityType(className);
        AuditSourceModule sourceModule = resolveSourceModule(className, method.getName());
        AuditAction action = resolveAction(method, joinPoint.getArgs());
        if (action == null) {
            return joinPoint.proceed();
        }

        String entityId = extractEntityId(joinPoint.getArgs(), method);
        Map<String, Object> oldValues = null;
        Object requestBody = extractRequestBody(joinPoint.getArgs(), method);

        if (action == AuditAction.UPDATE || action == AuditAction.DELETE) {
            oldValues = auditEntitySnapshotService.loadSnapshot(entityType, entityId);
        }

        Map<String, Object> newValues = null;
        if (requestBody != null && action != AuditAction.DELETE) {
            newValues = auditDiffUtil.toMap(requestBody);
        }

        boolean sensitive = isSensitive(action, entityType, method.getName());
        String exportFormat = resolveExportFormat(method.getName());
        Integer recordCount = null;

        try {
            Object result = joinPoint.proceed();

            if (action == AuditAction.CREATE || action == AuditAction.UPDATE) {
                Map<String, Object> resultMap = auditDiffUtil.toMap(result);
                if (resultMap != null) {
                    if (entityId == null && resultMap.get("id") != null) {
                        entityId = String.valueOf(resultMap.get("id"));
                    }
                    if (action == AuditAction.CREATE) {
                        newValues = resultMap;
                    } else if (action == AuditAction.UPDATE) {
                        newValues = resultMap;
                    }
                }
            }

            if (action == AuditAction.VIEW || action == AuditAction.DOWNLOAD) {
                if (result instanceof Employee employee) {
                    entityId = String.valueOf(employee.getId());
                    newValues = auditDiffUtil.toMap(employee);
                }
            }

            if (action == AuditAction.EXPORT) {
                recordCount = extractRecordCount(result);
            }

            String entityLabel = auditEntitySnapshotService.resolveEntityLabel(
                    unwrapResult(result),
                    entityType,
                    entityId
            );

            String activitySummary = null;
            Optional<AuditActivityDetails> activity = auditActivityResolver.resolve(
                    className,
                    method.getName(),
                    action,
                    entityType,
                    entityId,
                    requestBody,
                    unwrapResult(result),
                    oldValues
            );
            if (activity.isPresent()) {
                AuditActivityDetails details = activity.get();
                activitySummary = details.getActivitySummary();
                if (details.getEntityLabel() != null) {
                    entityLabel = details.getEntityLabel();
                }
                newValues = applyActivityDetails(
                        action,
                        sourceModule,
                        newValues,
                        oldValues,
                        details
                );
            }

            auditLogService.log(AuditEventRequest.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityLabel(entityLabel)
                    .activitySummary(activitySummary)
                    .sourceModule(sourceModule)
                    .status(AuditStatus.SUCCESS)
                    .exportFormat(exportFormat)
                    .recordCount(recordCount)
                    .sensitive(sensitive)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .build());

            return result;
        } catch (Throwable throwable) {
            auditLogService.log(AuditEventRequest.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityLabel(entityType)
                    .sourceModule(sourceModule)
                    .status(AuditStatus.FAILURE)
                    .failureReason(trimMessage(throwable.getMessage()))
                    .sensitive(sensitive)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .build());
            throw throwable;
        }
    }

    private Map<String, Object> applyActivityDetails(
            AuditAction action,
            AuditSourceModule sourceModule,
            Map<String, Object> newValues,
            Map<String, Object> oldValues,
            AuditActivityDetails activity
    ) {
        Map<String, Object> activityDetails = activity.getDetails();
        if (activityDetails == null || activityDetails.isEmpty()) {
            return newValues;
        }

        if (sourceModule == AuditSourceModule.LIFECYCLE
                && (action == AuditAction.CREATE || action == AuditAction.DELETE)) {
            return activityDetails;
        }

        if ("EMPLOYEE_PROFILE_VIEW".equals(activity.getActivityType())) {
            return activityDetails;
        }

        Map<String, Object> merged = new LinkedHashMap<>(activityDetails);
        if (newValues != null) {
            merged.putAll(newValues);
        }
        if (oldValues != null && action == AuditAction.UPDATE) {
            merged.putIfAbsent("previousActionDate", oldValues.get("actionDate"));
            merged.putIfAbsent("previousReason", oldValues.get("reason"));
        }
        return merged;
    }

    private AuditAction resolveAction(Method method, Object[] args) {
        if (method.isAnnotationPresent(PostMapping.class)) {
            String name = method.getName().toLowerCase();
            if (name.contains("export")) {
                return AuditAction.EXPORT;
            }
            if (name.contains("generatereport")) {
                return AuditAction.VIEW;
            }
            return AuditAction.CREATE;
        }
        if (method.isAnnotationPresent(PutMapping.class)) {
            return AuditAction.UPDATE;
        }
        if (method.isAnnotationPresent(DeleteMapping.class)) {
            return AuditAction.DELETE;
        }
        if (method.isAnnotationPresent(GetMapping.class)) {
            String name = method.getName().toLowerCase();
            if (name.contains("export")) {
                return AuditAction.EXPORT;
            }
            if (isInlineEmployeePhotoRequest(name)) {
                return null;
            }
            if (shouldAuditView(method.getName())) {
                return AuditAction.VIEW;
            }
            return null;
        }
        return null;
    }

    private boolean isInlineEmployeePhotoRequest(String methodName) {
        return methodName.equals("getemployeephoto");
    }

    private boolean shouldAuditView(String methodName) {
        String name = methodName.toLowerCase();
        return name.equals("getemployeebyid")
                || name.equals("generateReport".toLowerCase())
                || name.equals("generatereport");
    }

    private String resolveEntityType(String controllerName) {
        return switch (controllerName) {
            case "EmployeeController" -> "Employee";
            case "EmployeeActionController" -> "EmployeeAction";
            case "DesignationController" -> "Designation";
            case "ServiceTypeController" -> "ServiceType";
            case "OfficeController" -> "Office";
            case "ServiceLevelController" -> "ServiceLevel";
            case "CadrePositionController" -> "CadrePosition";
            case "CadreReportController" -> "CadreReport";
            case "AllEmployeeDetailsReportController" -> "AllEmployeeDetailsReport";
            case "DashboardController" -> "Dashboard";
            default -> controllerName.replace("Controller", "");
        };
    }

    private AuditSourceModule resolveSourceModule(String controllerName, String methodName) {
        if (controllerName.contains("Report")) {
            return AuditSourceModule.REPORT;
        }
        if (controllerName.equals("EmployeeController")) {
            String name = methodName.toLowerCase();
            if (name.contains("transfer")
                    || name.contains("promote")
                    || name.contains("retire")
                    || name.contains("death")
                    || name.contains("dismiss")
                    || name.contains("appointment")
                    || name.contains("permanent")
                    || name.contains("vehicle")) {
                return AuditSourceModule.LIFECYCLE;
            }
            return AuditSourceModule.EMPLOYEE_PROFILE;
        }
        if (controllerName.equals("EmployeeActionController")) {
            return AuditSourceModule.LIFECYCLE;
        }
        return AuditSourceModule.MASTER_DATA;
    }

    private boolean isSensitive(AuditAction action, String entityType, String methodName) {
        if (action == AuditAction.EXPORT || action == AuditAction.DOWNLOAD) {
            return true;
        }
        if (action == AuditAction.VIEW) {
            return "Employee".equals(entityType)
                    || "AllEmployeeDetailsReport".equals(entityType)
                    || methodName.toLowerCase().contains("generatereport");
        }
        if ("EmployeeAction".equals(entityType)) {
            return action == AuditAction.UPDATE || action == AuditAction.DELETE;
        }
        return "Employee".equals(entityType);
    }

    private String resolveExportFormat(String methodName) {
        String name = methodName.toLowerCase();
        if (name.contains("pdf")) {
            return "PDF";
        }
        if (name.contains("excel")) {
            return "EXCEL";
        }
        return null;
    }

    private Integer extractRecordCount(Object result) {
        Object value = unwrapResult(result);
        if (value instanceof AllEmployeeDetailsReportResponse report) {
            return report.getTotalCount() > 0
                    ? report.getTotalCount()
                    : (report.getRows() == null ? 0 : report.getRows().size());
        }
        if (value instanceof CadreReportResponse report) {
            return report.getRows() == null ? 0 : report.getRows().size();
        }
        return null;
    }

    private Object unwrapResult(Object result) {
        if (result instanceof ResponseEntity<?> responseEntity) {
            return responseEntity.getBody();
        }
        return result;
    }

    private String extractEntityId(Object[] args, Method method) {
        Parameter[] parameters = method.getParameters();
        for (int i = 0; i < parameters.length; i++) {
            if (parameters[i].isAnnotationPresent(PathVariable.class)) {
                PathVariable pathVariable = parameters[i].getAnnotation(PathVariable.class);
                String name = pathVariable.value().isBlank()
                        ? parameters[i].getName()
                        : pathVariable.value();
                if ("id".equals(name) && args[i] != null) {
                    return String.valueOf(args[i]);
                }
            }
        }
        return null;
    }

    private Object extractRequestBody(Object[] args, Method method) {
        Parameter[] parameters = method.getParameters();
        for (int i = 0; i < parameters.length; i++) {
            if (parameters[i].isAnnotationPresent(RequestBody.class)) {
                return args[i];
            }
            if (args[i] instanceof MultipartFile) {
                return Map.of("fileName", ((MultipartFile) args[i]).getOriginalFilename());
            }
        }
        return null;
    }

    private String trimMessage(String message) {
        if (message == null) {
            return "Unknown error";
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
