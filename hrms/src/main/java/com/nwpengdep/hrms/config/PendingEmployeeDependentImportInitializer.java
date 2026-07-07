package com.nwpengdep.hrms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.nwpengdep.hrms.dto.EmployeeChildRequest;
import com.nwpengdep.hrms.dto.EmployeeSpouseRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class PendingEmployeeDependentImportInitializer {

    private static final String SPOUSES_RESOURCE = "import/pending-employee-spouses.json";
    private static final String CHILDREN_RESOURCE = "import/pending-employee-children.json";

    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;

    @Value("${hrms.bootstrap.pending-employee-dependents.enabled:true}")
    private boolean bootstrapEnabled;

    @Order(101)
    @EventListener(ApplicationReadyEvent.class)
    public void importPendingEmployeeDependents() {
        if (!bootstrapEnabled) {
            return;
        }

        Set<String> allowedEmployeeNos = PendingEmployeeImportSupport.loadAllowedEmployeeNos();
        Map<String, EmployeeSpouseRequest> spousesByEmployeeNo = loadSpouses(allowedEmployeeNos);
        Map<String, List<EmployeeChildRequest>> childrenByEmployeeNo = loadChildren(
                allowedEmployeeNos
        );

        Set<String> employeeNos = new HashSet<>();
        employeeNos.addAll(spousesByEmployeeNo.keySet());
        employeeNos.addAll(childrenByEmployeeNo.keySet());

        int imported = 0;
        int skipped = 0;
        int failed = 0;

        for (String employeeNo : employeeNos) {
            EmployeeSpouseRequest spouse = spousesByEmployeeNo.get(employeeNo);
            List<EmployeeChildRequest> children = childrenByEmployeeNo.getOrDefault(
                    employeeNo,
                    List.of()
            );

            try {
                ImportResult result = importDependentsForEmployee(
                        employeeNo,
                        spouse,
                        children
                );
                switch (result) {
                    case IMPORTED -> imported++;
                    case SKIPPED -> skipped++;
                    case FAILED -> failed++;
                }
            } catch (RuntimeException ex) {
                log.error(
                        "Failed to import dependents for employee {}: {}",
                        employeeNo,
                        ex.getMessage()
                );
                failed++;
            }
        }

        log.info(
                "Pending employee dependent import finished: imported={}, skipped={}, failed={}",
                imported,
                skipped,
                failed
        );
    }

    private ImportResult importDependentsForEmployee(
            String employeeNo,
            EmployeeSpouseRequest spouse,
            List<EmployeeChildRequest> children
    ) {
        Employee employee = employeeRepository.findByEmployeeNo(employeeNo)
                .orElse(null);
        if (employee == null) {
            log.info(
                    "Skipped dependent import (employee not found): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        if (!isMarried(employee.getMaritalStatus())) {
            log.info(
                    "Skipped dependent import (employee not married): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        if (!isSystemPendingEmployee(employee)) {
            log.info(
                    "Skipped dependent import (employee is not system pending): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        boolean hasSpouseImport = !isBlankSpouse(spouse);
        List<EmployeeChildRequest> normalizedChildren = normalizeChildren(children);
        boolean hasChildrenImport = !normalizedChildren.isEmpty();

        if (!hasSpouseImport && !hasChildrenImport) {
            log.info(
                    "Skipped dependent import (no spouse or children data): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        if (dependentsAlreadySeeded(employee, hasSpouseImport, hasChildrenImport, spouse)) {
            log.info(
                    "Skipped dependent import (already seeded): {}",
                    employeeNo
            );
            return ImportResult.SKIPPED;
        }

        EmployeeUpdateRequest request = buildPendingUpdateRequest(
                employee,
                hasSpouseImport ? spouse : null,
                hasChildrenImport ? normalizedChildren : List.of()
        );
        employeeService.updateEmployee(employee.getId(), request);
        log.info(
                "Imported dependents for pending employee: {} ({})",
                employee.getEmployeeNo(),
                employee.getFullName()
        );
        return ImportResult.IMPORTED;
    }

    private Map<String, EmployeeSpouseRequest> loadSpouses(Set<String> allowedEmployeeNos) {
        List<SpouseImportRow> rows = PendingEmployeeImportSupport.loadResource(
                SPOUSES_RESOURCE,
                new TypeReference<List<SpouseImportRow>>() {}
        );

        Map<String, EmployeeSpouseRequest> spousesByEmployeeNo = new HashMap<>();
        for (SpouseImportRow row : rows) {
            if (row.employeeNo() == null || row.employeeNo().isBlank()) {
                continue;
            }
            String employeeNo = row.employeeNo().trim();
            if (!allowedEmployeeNos.contains(employeeNo)) {
                log.info(
                        "Ignored spouse import for employee {} (not in pending-employees.json)",
                        employeeNo
                );
                continue;
            }
            spousesByEmployeeNo.put(employeeNo, row.spouse());
        }
        return spousesByEmployeeNo;
    }

    private Map<String, List<EmployeeChildRequest>> loadChildren(Set<String> allowedEmployeeNos) {
        List<ChildrenImportRow> rows = PendingEmployeeImportSupport.loadResource(
                CHILDREN_RESOURCE,
                new TypeReference<List<ChildrenImportRow>>() {}
        );

        Map<String, List<EmployeeChildRequest>> childrenByEmployeeNo = new HashMap<>();
        for (ChildrenImportRow row : rows) {
            if (row.employeeNo() == null || row.employeeNo().isBlank()) {
                continue;
            }
            String employeeNo = row.employeeNo().trim();
            if (!allowedEmployeeNos.contains(employeeNo)) {
                log.info(
                        "Ignored children import for employee {} (not in pending-employees.json)",
                        employeeNo
                );
                continue;
            }
            childrenByEmployeeNo.put(
                    employeeNo,
                    row.children() != null ? row.children() : List.of()
            );
        }
        return childrenByEmployeeNo;
    }

    private List<EmployeeChildRequest> normalizeChildren(List<EmployeeChildRequest> children) {
        if (children == null || children.isEmpty()) {
            return List.of();
        }

        List<EmployeeChildRequest> normalized = new ArrayList<>();
        for (EmployeeChildRequest child : children) {
            if (child == null || isBlankChild(child)) {
                continue;
            }

            String birthCertificateNo = trimToNull(child.getBirthCertificateNo());
            String nic = trimToNull(child.getNic());
            if (birthCertificateNo == null && nic != null) {
                birthCertificateNo = nic;
            }

            EmployeeChildRequest normalizedChild = new EmployeeChildRequest();
            normalizedChild.setNic(nic);
            normalizedChild.setBirthCertificateNo(birthCertificateNo);
            normalizedChild.setFullName(trimToNull(child.getFullName()));
            normalizedChild.setDateOfBirth(child.getDateOfBirth());
            normalizedChild.setRelationship(child.getRelationship());
            normalized.add(normalizedChild);
        }
        return normalized;
    }

    private EmployeeUpdateRequest buildPendingUpdateRequest(
            Employee employee,
            EmployeeSpouseRequest spouse,
            List<EmployeeChildRequest> children
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
        request.setSpouse(spouse);
        request.setChildren(children);
        return request;
    }

    private boolean dependentsAlreadySeeded(
            Employee employee,
            boolean hasSpouseImport,
            boolean hasChildrenImport,
            EmployeeSpouseRequest spouse
    ) {
        boolean spouseSeeded = !hasSpouseImport
                || (employee.getSpouse() != null
                        && spouseNicMatches(employee.getSpouse(), spouse));
        boolean childrenSeeded = !hasChildrenImport
                || (employee.getChildren() != null && !employee.getChildren().isEmpty());
        return spouseSeeded && childrenSeeded;
    }

    private boolean spouseNicMatches(EmployeeSpouse existing, EmployeeSpouseRequest spouse) {
        String existingNic = trimToNull(existing.getNic());
        String importNic = trimToNull(spouse.getNic());
        if (existingNic == null || importNic == null) {
            return false;
        }
        return existingNic.equalsIgnoreCase(importNic);
    }

    private boolean isSystemPendingEmployee(Employee employee) {
        return EmployeePendingUtil.isSystemPending(
                employee,
                employeeActionRepository.existsActiveActionsByEmployeeId(employee.getId())
        );
    }

    private boolean isMarried(String maritalStatus) {
        return maritalStatus != null
                && "married".equalsIgnoreCase(maritalStatus.trim());
    }

    private boolean isBlankSpouse(EmployeeSpouseRequest spouse) {
        if (spouse == null) {
            return true;
        }
        return trimToNull(spouse.getNic()) == null
                && trimToNull(spouse.getFullName()) == null
                && spouse.getDateOfBirth() == null;
    }

    private boolean isBlankChild(EmployeeChildRequest child) {
        return trimToNull(child.getNic()) == null
                && trimToNull(child.getBirthCertificateNo()) == null
                && trimToNull(child.getFullName()) == null
                && child.getDateOfBirth() == null
                && child.getRelationship() == null;
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

    private record SpouseImportRow(String employeeNo, EmployeeSpouseRequest spouse) {
    }

    private record ChildrenImportRow(String employeeNo, List<EmployeeChildRequest> children) {
    }
}
