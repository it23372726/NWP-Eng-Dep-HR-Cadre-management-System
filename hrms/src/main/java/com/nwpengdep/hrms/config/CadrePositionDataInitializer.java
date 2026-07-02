package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.dto.CadrePositionRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.repository.CadrePositionRepository;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.service.CadrePositionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CadrePositionDataInitializer {

    private record CadreSeed(
            String designationName,
            String serviceCode,
            String serviceLevel,
            int approvedCount
    ) {}

    private static final List<CadreSeed> DEFAULT_CADRES = List.of(
            new CadreSeed("Provincial Director", "SLEgS", "Senior", 1),
            new CadreSeed("Additional Director", "SLEgS", "Senior", 1),
            new CadreSeed("Chief Accountant", "SLAcS", "Senior", 1),
            new CadreSeed("Chief Engineer (Building)", "SLEgS", "Senior", 1),
            new CadreSeed(
                    "Chief Engineer (Structure Design & Other Department)",
                    "SLEgS",
                    "Senior",
                    1
            ),
            new CadreSeed("Engineer (Civil)", "SLEgS", "Senior", 13),
            new CadreSeed("Engineer (Electrical)", "SLEgS", "Senior", 1),
            new CadreSeed("Architect", "SLArchS", "Senior", 3),
            new CadreSeed("Quantity Surveyor", "Dept.", "Senior", 1),
            new CadreSeed("Administrative Officer", "PPMAS", "Tertiary", 1),
            new CadreSeed("Technical Officer (Civil)", "SLTS", "Tertiary", 9),
            new CadreSeed("Draughtsman", "SLTS", "Tertiary", 2),
            new CadreSeed("Technical Officer (QS)", "SLTS", "Tertiary", 1),
            new CadreSeed("Development Officer", "DOS", "Secondary", 10),
            new CadreSeed("Technical Officer (Civil)", "SLTS", "Secondary", 102),
            new CadreSeed("Draughtsman", "SLTS", "Secondary", 18),
            new CadreSeed("Technical Officer (QS)", "SLTS", "Secondary", 10),
            new CadreSeed("Management Service Officer", "PPMAS", "Secondary", 50),
            new CadreSeed("Driver", "PDS", "Primary", 19),
            new CadreSeed("Plan Printing Machine Operator", "Dept.", "Primary", 1),
            new CadreSeed("K.K.S.", "OES", "Primary", 12),
            new CadreSeed("Watcher", "OES", "Primary", 7),
            new CadreSeed("Watcher", "Dept.", "Primary", 1),
            new CadreSeed("Labourer", "OES", "Primary", 12),
            new CadreSeed("Labourer", "Dept.", "Primary", 1)
    );

    private final CadrePositionRepository cadrePositionRepository;
    private final DesignationRepository designationRepository;
    private final CadrePositionService cadrePositionService;

    @Order(12)
    @EventListener(ApplicationReadyEvent.class)
    public void seedCadres() {
        for (CadreSeed seed : DEFAULT_CADRES) {
            Designation designation = designationRepository
                    .findByDesignationNameIgnoreCaseAndService_ServiceCodeIgnoreCaseAndServiceLevel_LevelNameIgnoreCase(
                            seed.designationName(),
                            seed.serviceCode(),
                            seed.serviceLevel()
                    )
                    .orElse(null);

            if (designation == null) {
                log.warn(
                        "Skipping cadre for '{}': designation not found ({}, {})",
                        seed.designationName(),
                        seed.serviceCode(),
                        seed.serviceLevel()
                );
                continue;
            }

            if (cadrePositionRepository.existsByDesignationId(designation.getId())) {
                continue;
            }

            CadrePositionRequest request = new CadrePositionRequest();
            request.setDesignationId(designation.getId());
            request.setApprovedCount(seed.approvedCount());

            cadrePositionService.createCadre(request);
            log.info(
                    "Seeded cadre: {} ({}, {}) — approved count {}",
                    seed.designationName(),
                    seed.serviceCode(),
                    seed.serviceLevel(),
                    seed.approvedCount()
            );
        }
    }
}
