package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.RolePermissionMatrixResponse;
import com.nwpengdep.hrms.dto.RolePermissionRowResponse;
import com.nwpengdep.hrms.dto.RolePermissionUpdateRequest;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/role-permissions")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('SUPER_ADMIN')")
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    @GetMapping
    public RolePermissionMatrixResponse getMatrix() {
        return rolePermissionService.getMatrix();
    }

    @PutMapping("/{role}")
    public RolePermissionRowResponse updateRolePermissions(
            @PathVariable UserRole role,
            @RequestBody RolePermissionUpdateRequest request
    ) {
        return rolePermissionService.updateRolePermissions(role, request);
    }
}
