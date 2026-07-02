package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.ServiceLevelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceLevelDataInitializer {

    private static final List<String> DEFAULT_LEVELS = List.of(
            "Senior",
            "Tertiary",
            "Secondary",
            "Primary",
            "Training"
    );

    private final ServiceLevelRepository serviceLevelRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void seedServiceLevels() {
        for (String levelName : DEFAULT_LEVELS) {
            if (serviceLevelRepository
                    .findByLevelNameIgnoreCase(levelName)
                    .isEmpty()) {
                serviceLevelRepository.save(
                        ServiceLevel.builder()
                                .levelName(levelName)
                                .build()
                );
                log.info("Seeded service level: {}", levelName);
            }
        }
    }
}
