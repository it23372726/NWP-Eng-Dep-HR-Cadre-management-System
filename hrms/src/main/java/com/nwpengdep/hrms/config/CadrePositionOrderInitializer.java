package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.entity.CadrePosition;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.service.CadrePositionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CadrePositionOrderInitializer {

    private final CadrePositionRepository cadrePositionRepository;
    private final CadrePositionService cadrePositionService;

    @EventListener(ApplicationReadyEvent.class)
    @Order(2)
    @Transactional
    public void initializeMissingDisplayOrders() {
        List<CadrePosition> cadres = new ArrayList<>(cadrePositionRepository.findAll());
        boolean needsInitialization = cadres.stream()
                .anyMatch(cadre -> cadre.getDisplayOrder() == null);

        if (!needsInitialization) {
            return;
        }

        cadrePositionService.sortCadresForDisplay(cadres);

        for (int index = 0; index < cadres.size(); index++) {
            cadres.get(index).setDisplayOrder(index + 1);
        }

        cadrePositionRepository.saveAll(cadres);
        log.info("Initialized display order for {} cadre positions", cadres.size());
    }
}
