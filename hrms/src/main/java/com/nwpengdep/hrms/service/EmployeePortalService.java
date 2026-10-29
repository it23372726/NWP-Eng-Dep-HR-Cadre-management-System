package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.AuthResponse;
import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.LoginRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.security.EmployeePrincipal;
import com.nwpengdep.hrms.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EmployeePortalService {
    private final EmployeeRepository employees;
    private final EmployeeActionService actions;
    private final JwtService jwt;
    private final AuditLogService auditLogService;

    public static boolean eligible(Employee employee) {
        return employee != null && employee.getEmployeeNo() != null && !employee.getEmployeeNo().isBlank()
                && employee.getNic() != null && !employee.getNic().isBlank();
    }

    public AuthResponse login(LoginRequest request) {
        String number = request.getUsername() == null ? "" : request.getUsername().trim();
        String password = normalizeNic(request.getPassword());
        Employee employee = number.isEmpty() ? null : employees.findByEmployeeNo(number).orElse(null);
        // Compare fixed-length digests; never log or return submitted credentials.
        boolean matches = MessageDigest.isEqual(digest(password), digest(employee == null ? "" : normalizeNic(employee.getNic())));
        if (!eligible(employee) || password.isEmpty() || !matches) {
            logLogin(number, false);
            throw new BadCredentialsException("The S/N number or NIC is incorrect.");
        }
        logLogin(employee.getEmployeeNo(), true);
        return new AuthResponse(jwt.generateEmployeeToken(employee), employee.getEmployeeNo(), "EMPLOYEE", List.of());
    }

    @Transactional(readOnly = true)
    public Employee profile(EmployeePrincipal principal) {
        // Deliberately avoid the administrative getEmployeeById path, which synchronizes and saves records.
        Employee employee = employees.findById(principal.employeeId()).orElseThrow(() -> new BadCredentialsException("Invalid employee session"));
        if (!eligible(employee)) throw new BadCredentialsException("Invalid employee session");
        return employee;
    }

    @Transactional(readOnly = true)
    public List<EmployeeActionResponse> history(EmployeePrincipal principal) {
        profile(principal);
        List<EmployeeActionResponse> history = actions.getEmployeeActionHistory(principal.employeeId());
        history.forEach(action -> {
            action.setCanEdit(false);
            action.setCanDelete(false);
            action.setCanModify(false);
        });
        return history;
    }

    private void logLogin(String number, boolean success) {
        auditLogService.log(com.nwpengdep.hrms.audit.AuditEventRequest.builder()
                .action(success ? com.nwpengdep.hrms.audit.AuditAction.LOGIN : com.nwpengdep.hrms.audit.AuditAction.LOGIN_FAILED)
                .entityType("EmployeePortal")
                .activitySummary(success ? "Employee Sign In" : "Employee Sign In Failed")
                .sourceModule(com.nwpengdep.hrms.audit.AuditSourceModule.AUTH)
                .status(success ? com.nwpengdep.hrms.audit.AuditStatus.SUCCESS : com.nwpengdep.hrms.audit.AuditStatus.FAILURE)
                .usernameOverride(number).userRoleOverride("EMPLOYEE")
                .build());
    }

    private static String normalizeNic(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
    private static byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
