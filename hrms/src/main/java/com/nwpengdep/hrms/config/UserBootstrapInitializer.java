package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserBootstrapInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${hrms.bootstrap.super-admin.enabled:true}")
    private boolean bootstrapEnabled;

    @Value("${hrms.bootstrap.super-admin.username:superadmin}")
    private String bootstrapUsername;

    @Value("${hrms.bootstrap.super-admin.password:}")
    private String bootstrapPassword;

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapSuperAdmin() {
        if (!bootstrapEnabled) {
            return;
        }

        if (userRepository.count() > 0) {
            return;
        }

        if (bootstrapUsername == null || bootstrapUsername.isBlank()) {
            log.warn("Super admin bootstrap skipped: username is blank");
            return;
        }

        if (bootstrapPassword == null || bootstrapPassword.isBlank()) {
            log.warn("Super admin bootstrap skipped: password is not configured");
            return;
        }

        User user = User.builder()
                .username(bootstrapUsername.trim())
                .password(passwordEncoder.encode(bootstrapPassword))
                .role(UserRole.SUPER_ADMIN)
                .active(true)
                .build();

        userRepository.save(user);
        log.info(
                "Created initial SUPER_ADMIN user '{}'. Change the bootstrap password in application.properties after first login.",
                bootstrapUsername.trim()
        );
    }
}
