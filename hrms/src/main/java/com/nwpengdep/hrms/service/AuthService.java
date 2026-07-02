package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.AuthResponse;
import com.nwpengdep.hrms.dto.LoginRequest;
import com.nwpengdep.hrms.dto.RegisterRequest;
import com.nwpengdep.hrms.dto.UserCreateRequest;
import com.nwpengdep.hrms.dto.UserResponse;
import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.repository.UserRepository;
import com.nwpengdep.hrms.security.JwtService;
import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;
    private final CurrentUserService currentUserService;
    private final UserService userService;

    public UserResponse register(RegisterRequest request) {
        UserCreateRequest createRequest = new UserCreateRequest();
        createRequest.setUsername(request.getUsername());
        createRequest.setPassword(request.getPassword());
        createRequest.setRole(request.getRole());
        return userService.createUser(createRequest);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        if (user == null) {
            logFailedLogin(request.getUsername(), "User not found");
            throw new RuntimeException("User not found");
        }

        boolean passwordMatches = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!passwordMatches) {
            logFailedLogin(request.getUsername(), "Invalid password");
            throw new RuntimeException("Invalid password");
        }

        if (!user.isActive()) {
            logFailedLogin(request.getUsername(), "User inactive");
            throw new RuntimeException("User account is inactive");
        }

        String token = jwtService.generateToken(user.getUsername());

        auditLogService.log(AuditEventRequest.builder()
                .action(AuditAction.LOGIN)
                .entityType("User")
                .entityId(String.valueOf(user.getId()))
                .entityLabel(user.getUsername())
                .activitySummary("Sign In")
                .sourceModule(AuditSourceModule.AUTH)
                .status(AuditStatus.SUCCESS)
                .usernameOverride(user.getUsername())
                .userRoleOverride(user.getRole().name())
                .build());

        return new AuthResponse(token, user.getUsername(), user.getRole().name());
    }

    public void logout() {
        currentUserService.getCurrentUser().ifPresent(user ->
                auditLogService.log(AuditEventRequest.builder()
                        .action(AuditAction.LOGOUT)
                        .entityType("User")
                        .entityId(String.valueOf(user.getId()))
                        .entityLabel(user.getUsername())
                        .activitySummary("Sign Out")
                        .sourceModule(AuditSourceModule.AUTH)
                        .status(AuditStatus.SUCCESS)
                        .build())
        );
    }

    private void logFailedLogin(String username, String reason) {
        auditLogService.log(AuditEventRequest.builder()
                .action(AuditAction.LOGIN_FAILED)
                .entityType("User")
                .entityLabel(username)
                .activitySummary("Sign In Failed")
                .sourceModule(AuditSourceModule.AUTH)
                .status(AuditStatus.FAILURE)
                .failureReason(reason)
                .usernameOverride(username)
                .userRoleOverride("UNKNOWN")
                .build());
    }
}
