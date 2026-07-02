package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditDiffUtil;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import com.nwpengdep.hrms.dto.UserCreateRequest;
import com.nwpengdep.hrms.dto.UserPasswordResetRequest;
import com.nwpengdep.hrms.dto.UserResponse;
import com.nwpengdep.hrms.dto.UserUpdateRequest;
import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;
    private final AuditDiffUtil auditDiffUtil;

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return userRepository.findAllByOrderByUsernameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        return toResponse(requireUser(id));
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        String username = request.getUsername().trim();

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .active(true)
                .build();

        User saved = userRepository.save(user);

        auditUserChange(
                AuditAction.CREATE,
                saved,
                null,
                auditDiffUtil.toMap(toAuditSnapshot(saved)),
                "Create User Account"
        );

        return toResponse(saved);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = requireUser(id);
        Map<String, Object> oldValues = auditDiffUtil.toMap(toAuditSnapshot(user));

        if (request.getRole() != null && request.getRole() != user.getRole()) {
            ensureNotLastActiveSuperAdmin(user, request.getRole(), request.getActive());
            user.setRole(request.getRole());
        }

        if (request.getActive() != null && request.getActive() != user.isActive()) {
            if (!request.getActive()) {
                ensureCanDeactivate(user);
            }
            ensureNotLastActiveSuperAdmin(
                    user,
                    request.getRole() != null ? request.getRole() : user.getRole(),
                    request.getActive()
            );
            user.setActive(request.getActive());
        }

        User saved = userRepository.save(user);

        auditUserChange(
                AuditAction.UPDATE,
                saved,
                oldValues,
                auditDiffUtil.toMap(toAuditSnapshot(saved)),
                "Update User Account"
        );

        return toResponse(saved);
    }

    @Transactional
    public UserResponse resetPassword(Long id, UserPasswordResetRequest request) {
        User user = requireUser(id);
        Map<String, Object> oldValues = Map.of("password", "[REDACTED]");

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        User saved = userRepository.save(user);

        auditUserChange(
                AuditAction.UPDATE,
                saved,
                oldValues,
                Map.of("password", "[REDACTED]"),
                "Reset User Password"
        );

        return toResponse(saved);
    }

    private User requireUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void ensureCanDeactivate(User user) {
        currentUserService.getCurrentUserId().ifPresent(currentUserId -> {
            if (currentUserId.equals(user.getId())) {
                throw new RuntimeException("You cannot deactivate your own account");
            }
        });
    }

    private void ensureNotLastActiveSuperAdmin(
            User user,
            UserRole targetRole,
            Boolean targetActive
    ) {
        boolean currentlyActiveSuperAdmin =
                user.isActive() && user.getRole() == UserRole.SUPER_ADMIN;

        boolean willRemainActiveSuperAdmin =
                (targetActive == null ? user.isActive() : targetActive)
                        && (targetRole == UserRole.SUPER_ADMIN);

        if (currentlyActiveSuperAdmin && !willRemainActiveSuperAdmin) {
            long activeSuperAdmins = userRepository.countByRoleAndActiveTrue(UserRole.SUPER_ADMIN);
            if (activeSuperAdmins <= 1) {
                throw new RuntimeException("Cannot remove or deactivate the last active SUPER_ADMIN");
            }
        }
    }

    private Map<String, Object> toAuditSnapshot(User user) {
        return Map.of(
                "username", user.getUsername(),
                "role", user.getRole().name(),
                "active", user.isActive()
        );
    }

    private void auditUserChange(
            AuditAction action,
            User user,
            Map<String, Object> oldValues,
            Map<String, Object> newValues,
            String activitySummary
    ) {
        auditLogService.log(AuditEventRequest.builder()
                .action(action)
                .entityType("User")
                .entityId(String.valueOf(user.getId()))
                .entityLabel(user.getUsername())
                .activitySummary(activitySummary)
                .sourceModule(AuditSourceModule.AUTH)
                .status(AuditStatus.SUCCESS)
                .sensitive(true)
                .oldValues(oldValues)
                .newValues(newValues)
                .build());
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .active(user.isActive())
                .build();
    }
}
