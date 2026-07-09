package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Permission;
import com.nwpengdep.hrms.entity.RolePermission;
import com.nwpengdep.hrms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRole(UserRole role);

    List<RolePermission> findByRoleIn(Set<UserRole> roles);

    @Modifying
    @Transactional
    void deleteByRole(UserRole role);

    boolean existsByRoleAndPermission(UserRole role, Permission permission);
}
