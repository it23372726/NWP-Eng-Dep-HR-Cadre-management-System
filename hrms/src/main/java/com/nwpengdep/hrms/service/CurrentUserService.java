package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public Optional<String> getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return Optional.of(userDetails.getUsername());
        }

        if (principal instanceof String username && !"anonymousUser".equals(username)) {
            return Optional.of(username);
        }

        return Optional.empty();
    }

    public Optional<User> getCurrentUser() {
        return getCurrentUsername().flatMap(userRepository::findByUsername);
    }

    public Optional<Long> getCurrentUserId() {
        return getCurrentUser().map(User::getId);
    }

    public Optional<UserRole> getCurrentUserRole() {
        return getCurrentUser().map(User::getRole);
    }

    public String getCurrentUsernameOrDefault(String defaultUsername) {
        return getCurrentUsername().orElse(defaultUsername);
    }

    public String getCurrentUserRoleNameOrDefault(String defaultRole) {
        return getCurrentUserRole()
                .map(UserRole::name)
                .orElse(defaultRole);
    }
}
