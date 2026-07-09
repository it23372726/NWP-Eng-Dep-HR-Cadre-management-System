package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.dto.OfficeRequest;
import com.nwpengdep.hrms.repository.OfficeRepository;
import com.nwpengdep.hrms.service.OfficeService;
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
public class OfficeDataInitializer {

    private record OfficeSeed(String name, String district) {}

    private static final List<OfficeSeed> DEFAULT_OFFICES = List.of(
            new OfficeSeed("Engineering Department - Head Office", "Kurunegala"),
            new OfficeSeed("Kurunegala", "Kurunegala"),
            new OfficeSeed("Kuliyapitiya", "Kurunegala"),
            new OfficeSeed("Maho", "Kurunegala"),
            new OfficeSeed("Rideegama", "Kurunegala"),
            new OfficeSeed("Wariyapola", "Kurunegala"),
            new OfficeSeed("Puttalam", "Puttalam"),
            new OfficeSeed("Wennappuwa", "Puttalam")
    );

    private final OfficeRepository officeRepository;
    private final OfficeService officeService;

    @Order(5)
    @EventListener(ApplicationReadyEvent.class)
    public void seedOffices() {
        for (OfficeSeed seed : DEFAULT_OFFICES) {
            if (officeRepository.existsByNameIgnoreCaseAndDistrictIgnoreCase(
                    seed.name(),
                    seed.district()
            )) {
                continue;
            }

            OfficeRequest request = new OfficeRequest();
            request.setName(seed.name());
            request.setDistrict(seed.district());

            officeService.create(request);
            log.info(
                    "Seeded office: {} ({})",
                    seed.name(),
                    seed.district()
            );
        }
    }
}
