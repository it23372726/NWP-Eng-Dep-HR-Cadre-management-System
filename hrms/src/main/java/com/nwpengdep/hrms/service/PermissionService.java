package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Permission;
import com.nwpengdep.hrms.entity.RolePermission;
import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final RolePermissionRepository rolePermissionRepository;

    @Transactional(readOnly = true)
    public Set<Permission> getPermissionsForRole(UserRole role) {
        if (role == UserRole.SUPER_ADMIN) {
            return EnumSet.allOf(Permission.class);
        }

        return rolePermissionRepository.findByRole(role).stream()
                .map(RolePermission::getPermission)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(Permission.class)));
    }

    @Transactional(readOnly = true)
    public Set<Permission> getPermissionsForUser(User user) {
        return getPermissionsForRole(user.getRole());
    }

    @Transactional(readOnly = true)
    public List<String> getPermissionNamesForUser(User user) {
        return getPermissionsForUser(user).stream()
                .map(Permission::name)
                .sorted()
                .toList();
    }

    public static List<Permission> allPermissions() {
        return Arrays.stream(Permission.values()).toList();
    }
}
