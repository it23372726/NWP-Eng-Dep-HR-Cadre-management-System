package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.Permission;
import com.nwpengdep.hrms.entity.RolePermission;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class RolePermissionBootstrapInitializer {

    private static final Map<UserRole, Set<Permission>> DEFAULT_PERMISSIONS = Map.of(
            UserRole.SUBJECT_OFF_EMP, EnumSet.of(Permission.DASHBOARD, Permission.EMPLOYEE_EDIT),
            UserRole.SUBJECT_OFF_ORG, EnumSet.of(Permission.DASHBOARD, Permission.ORGANIZATION),
            UserRole.VIEW_ONLY, EnumSet.of(
                    Permission.DASHBOARD,
                    Permission.EMPLOYEE_VIEW,
                    Permission.ORGANIZATION,
                    Permission.REPORTS
            )
    );

    private final RolePermissionRepository rolePermissionRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultRolePermissions() {
        if (rolePermissionRepository.count() > 0) {
            return;
        }

        DEFAULT_PERMISSIONS.forEach((role, permissions) ->
                permissions.forEach(permission ->
                        rolePermissionRepository.save(RolePermission.builder()
                                .role(role)
                                .permission(permission)
                                .build())
                )
        );

        log.info("Seeded default role permissions for configurable roles");
    }
}
