package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.RolePermissionMatrixResponse;
import com.nwpengdep.hrms.dto.RolePermissionRowResponse;
import com.nwpengdep.hrms.dto.RolePermissionUpdateRequest;
import com.nwpengdep.hrms.entity.Permission;
import com.nwpengdep.hrms.entity.RolePermission;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public RolePermissionMatrixResponse getMatrix() {
        List<RolePermissionRowResponse> rows = Arrays.stream(UserRole.values())
                .filter(UserRole::isConfigurable)
                .map(this::toRow)
                .toList();

        return RolePermissionMatrixResponse.builder()
                .permissions(PermissionService.allPermissions().stream()
                        .map(Permission::name)
                        .toList())
                .roles(rows)
                .build();
    }

    @Transactional
    public RolePermissionRowResponse updateRolePermissions(
            UserRole role,
            RolePermissionUpdateRequest request
    ) {
        if (!role.isConfigurable()) {
            throw new RuntimeException("Permissions for " + role.name() + " cannot be modified");
        }

        Set<Permission> requested = request.getPermissions() == null
                ? EnumSet.noneOf(Permission.class)
                : request.getPermissions().stream()
                        .map(Permission::valueOf)
                        .collect(Collectors.toCollection(() -> EnumSet.noneOf(Permission.class)));

        if (requested.contains(Permission.EMPLOYEE_VIEW)
                && requested.contains(Permission.EMPLOYEE_EDIT)) {
            throw new IllegalArgumentException(
                    "EMPLOYEE_VIEW and EMPLOYEE_EDIT cannot both be assigned to the same role");
        }

        rolePermissionRepository.deleteByRole(role);
        rolePermissionRepository.flush();

        List<RolePermission> saved = requested.stream()
                .map(permission -> RolePermission.builder()
                        .role(role)
                        .permission(permission)
                        .build())
                .map(rolePermissionRepository::save)
                .toList();

        return toRow(role, saved.stream()
                .map(RolePermission::getPermission)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(Permission.class))));
    }

    private RolePermissionRowResponse toRow(UserRole role) {
        Set<Permission> permissions = permissionService.getPermissionsForRole(role);
        return toRow(role, permissions);
    }

    private RolePermissionRowResponse toRow(UserRole role, Set<Permission> permissions) {
        Map<String, Boolean> permissionMap = new LinkedHashMap<>();
        for (Permission permission : Permission.values()) {
            permissionMap.put(permission.name(), permissions.contains(permission));
        }

        return RolePermissionRowResponse.builder()
                .role(role.name())
                .permissions(permissionMap)
                .build();
    }
}
