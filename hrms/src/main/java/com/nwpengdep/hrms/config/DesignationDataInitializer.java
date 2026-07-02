package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.dto.DesignationRequest;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.ServiceLevelRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import com.nwpengdep.hrms.service.DesignationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DesignationDataInitializer {

    private record DesignationSeed(
            String name,
            String salaryCode,
            String serviceCode,
            String serviceLevel,
            Set<Grade> grades
    ) {}

    private static final List<DesignationSeed> DEFAULT_DESIGNATIONS = List.of(
            new DesignationSeed(
                    "Provincial Director",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.I)
            ),
            new DesignationSeed(
                    "Additional Director",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.I)
            ),
            new DesignationSeed(
                    "Chief Accountant",
                    "SL1-2025",
                    "SLAcS",
                    "Senior",
                    EnumSet.of(Grade.I)
            ),
            new DesignationSeed(
                    "Chief Engineer (Building)",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.I)
            ),
            new DesignationSeed(
                    "Chief Engineer (Structure Design & Other Department)",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.I)
            ),
            new DesignationSeed(
                    "Engineer (Civil)",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.III, Grade.II)
            ),
            new DesignationSeed(
                    "Engineer (Electrical)",
                    "SL1-2025",
                    "SLEgS",
                    "Senior",
                    EnumSet.of(Grade.III, Grade.II)
            ),
            new DesignationSeed(
                    "Architect",
                    "SL1-2025",
                    "SLArchS",
                    "Senior",
                    EnumSet.of(Grade.III, Grade.II)
            ),
            new DesignationSeed(
                    "Quantity Surveyor",
                    "SL1-2025",
                    "Dept.",
                    "Senior",
                    EnumSet.of(Grade.III, Grade.II)
            ),
            new DesignationSeed(
                    "Administrative Officer",
                    "MN7-2025",
                    "PPMAS",
                    "Tertiary",
                    EnumSet.of(Grade.SUPRA)
            ),
            new DesignationSeed(
                    "Technical Officer (Civil)",
                    "MN7-2025",
                    "SLTS",
                    "Tertiary",
                    EnumSet.of(Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Draughtsman",
                    "MN7-2025",
                    "SLTS",
                    "Tertiary",
                    EnumSet.of(Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Technical Officer (QS)",
                    "MN7-2025",
                    "SLTS",
                    "Tertiary",
                    EnumSet.of(Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Development Officer",
                    "MN4-2025",
                    "DOS",
                    "Secondary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new DesignationSeed(
                    "Technical Officer (Civil)",
                    "MN3-2025",
                    "SLTS",
                    "Secondary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new DesignationSeed(
                    "Draughtsman",
                    "MN3-2025",
                    "SLTS",
                    "Secondary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new DesignationSeed(
                    "Technical Officer (QS)",
                    "MN3-2025",
                    "SLTS",
                    "Secondary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new DesignationSeed(
                    "Management Service Officer",
                    "MN2-2025",
                    "PPMAS",
                    "Secondary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new DesignationSeed(
                    "Driver",
                    "PL3-2025",
                    "PDS",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Plan Printing Machine Operator",
                    "PL2-2025",
                    "Dept.",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "K.K.S.",
                    "PL1-2025",
                    "OES",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Watcher",
                    "PL1-2025",
                    "OES",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Watcher",
                    "PL1-2025",
                    "Dept.",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Labourer",
                    "PL1-2025",
                    "OES",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new DesignationSeed(
                    "Labourer",
                    "PL1-2025",
                    "Dept.",
                    "Primary",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            )
    );

    private final DesignationRepository designationRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final ServiceLevelRepository serviceLevelRepository;
    private final DesignationService designationService;

    @Order(11)
    @EventListener(ApplicationReadyEvent.class)
    public void seedDesignations() {
        for (DesignationSeed seed : DEFAULT_DESIGNATIONS) {
            ServiceType service = serviceTypeRepository
                    .findByServiceCodeIgnoreCase(seed.serviceCode())
                    .orElse(null);
            if (service == null) {
                log.warn(
                        "Skipping designation '{}': service '{}' not found",
                        seed.name(),
                        seed.serviceCode()
                );
                continue;
            }

            ServiceLevel serviceLevel = serviceLevelRepository
                    .findByLevelNameIgnoreCase(seed.serviceLevel())
                    .orElse(null);
            if (serviceLevel == null) {
                log.warn(
                        "Skipping designation '{}': service level '{}' not found",
                        seed.name(),
                        seed.serviceLevel()
                );
                continue;
            }

            if (designationRepository
                    .findByDesignationNameIgnoreCaseAndService_ServiceCodeIgnoreCaseAndServiceLevel_LevelNameIgnoreCase(
                            seed.name(),
                            seed.serviceCode(),
                            seed.serviceLevel()
                    )
                    .isPresent()) {
                continue;
            }

            DesignationRequest request = new DesignationRequest();
            request.setDesignationName(seed.name());
            request.setSalaryCode(seed.salaryCode());
            request.setServiceId(service.getId());
            request.setServiceLevelId(serviceLevel.getId());
            request.setAllowedGrades(seed.grades());

            try {
                designationService.createDesignation(request);
                log.info(
                        "Seeded designation: {} ({}, {})",
                        seed.name(),
                        seed.serviceCode(),
                        seed.serviceLevel()
                );
            } catch (Exception e) {
                log.warn(
                        "Skipping designation '{}': {}",
                        seed.name(),
                        e.getMessage()
                );
            }
        }
    }
}
