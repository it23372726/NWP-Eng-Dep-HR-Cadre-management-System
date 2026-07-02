package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.audit.AuditDiffUtil;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.OfficeRepository;
import com.nwpengdep.hrms.repository.ServiceLevelRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditEntitySnapshotService {

    private final AuditDiffUtil auditDiffUtil;
    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final DesignationRepository designationRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final OfficeRepository officeRepository;
    private final ServiceLevelRepository serviceLevelRepository;
    private final CadrePositionRepository cadrePositionRepository;

    public Map<String, Object> loadSnapshot(String entityType, String entityId) {
        if (entityType == null || entityId == null) {
            return null;
        }

        try {
            Long id = Long.parseLong(entityId);
            return switch (entityType) {
                case "Employee" -> employeeRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "EmployeeAction" -> employeeActionRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "Designation" -> designationRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "ServiceType" -> serviceTypeRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "Office" -> officeRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "ServiceLevel" -> serviceLevelRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                case "CadrePosition" -> cadrePositionRepository.findById(id)
                        .map(auditDiffUtil::toMap)
                        .orElse(null);
                default -> null;
            };
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public String resolveEntityLabel(Object result, String entityType, String entityId) {
        if (result instanceof Employee employee) {
            return employee.getFullName() + " (" + employee.getNic() + ")";
        }
        if (result instanceof EmployeeAction action) {
            return action.getActionType() + " action #" + action.getId();
        }
        if (result != null && entityType != null && entityId != null) {
            return entityType + " #" + entityId;
        }
        return entityType;
    }
}
