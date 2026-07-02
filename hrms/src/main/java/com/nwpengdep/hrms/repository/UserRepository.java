package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    long countByRoleAndActiveTrue(UserRole role);

    List<User> findAllByOrderByUsernameAsc();
}
