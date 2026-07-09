package com.nwpengdep.hrms.config;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.util.DefaultServiceRequirements;
import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;
import com.nwpengdep.hrms.service.ServiceTypeService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceTypeDataInitializer {

    private record ServiceSeed(String code, String description, Set<Grade> grades) {}

    private static final List<ServiceSeed> DEFAULT_SERVICES = List.of(
            new ServiceSeed(
                    "SLEgS",
                    "Sri Lanka Engineering Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new ServiceSeed(
                    "SLAcS",
                    "Sri Lanka Accountants' Service",
                    EnumSet.of(Grade.I)
            ),
            new ServiceSeed(
                    "SLArchS",
                    "Sri Lanka Architects' Service",
                    EnumSet.of(Grade.III, Grade.II)
            ),
            new ServiceSeed(
                    "SLTS",
                    "Sri Lanka Technological Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new ServiceSeed(
                    "PPMAS",
                    "Provincial Planning Management Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SUPRA)
            ),
            new ServiceSeed(
                    "DOS",
                    "Development Officers' Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I)
            ),
            new ServiceSeed(
                    "PDS",
                    "Primary Development Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new ServiceSeed(
                    "OES",
                    "Office Employees' Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            ),
            new ServiceSeed(
                    "Dept.",
                    "Department Recruitment Service",
                    EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SPECIAL)
            )
    );

    private final ServiceTypeRepository serviceTypeRepository;
    private final ServiceTypeService serviceTypeService;

    @Order(10)
    @EventListener(ApplicationReadyEvent.class)
    public void seedServices() {
        for (ServiceSeed seed : DEFAULT_SERVICES) {
            if (serviceTypeRepository.existsByServiceCodeIgnoreCase(seed.code())) {
                continue;
            }

            ServiceTypeRequest request = new ServiceTypeRequest();
            request.setServiceCode(seed.code());
            request.setDescription(seed.description());
            request.setAllowedGrades(seed.grades());
            request.setGrade2RequiredYears(0);
            request.setGrade1RequiredYears(0);

            if (seed.grades().contains(Grade.SUPRA)) {
                request.setSupraRequiredYears(0);
            }

            if (seed.grades().contains(Grade.SPECIAL)) {
                request.setSpecialRequiredYears(0);
            }

            request.setCustomPermanentRequirements(
                    DefaultServiceRequirements.PERMANENT_NAMES
            );
            request.setCustomGrade2Requirements(
                    DefaultServiceRequirements.GRADE2_NAMES
            );
            request.setCustomGrade1Requirements(
                    DefaultServiceRequirements.GRADE1_NAMES
            );
            request.setCustomSupraRequirements(
                    seed.grades().contains(Grade.SUPRA)
                            ? DefaultServiceRequirements.SUPRA_NAMES
                            : List.of()
            );
            request.setCustomSpecialRequirements(
                    seed.grades().contains(Grade.SPECIAL)
                            ? DefaultServiceRequirements.SPECIAL_NAMES
                            : List.of()
            );

            serviceTypeService.createService(request);
            log.info("Seeded service: {}", seed.code());
        }
    }
}
