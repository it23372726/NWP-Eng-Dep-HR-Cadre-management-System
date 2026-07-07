package com.nwpengdep.hrms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PendingEmployeeImportInitializer {

    private static final String IMPORT_RESOURCE = "import/pending-employees.json";

    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository;

    @Value("${hrms.bootstrap.pending-employees.enabled:true}")
    private boolean bootstrapEnabled;

    @Order(100)
    @EventListener(ApplicationReadyEvent.class)
    public void importPendingEmployees() {
        if (!bootstrapEnabled) {
            return;
        }

        List<EmployeeRequest> requests = loadImportData();
        int created = 0;
        int skipped = 0;
        int failed = 0;

        for (EmployeeRequest request : requests) {
            String employeeNo = request.getEmployeeNo() != null
                    ? request.getEmployeeNo().trim()
                    : "";
            String nic = request.getNic() != null ? request.getNic().trim() : "";

            if (employeeNo.isEmpty() || nic.isEmpty()) {
                log.warn("Skipping import row with missing employeeNo or NIC");
                failed++;
                continue;
            }

            if (employeeRepository.existsByEmployeeNo(employeeNo)
                    || employeeRepository.existsByNicIgnoreCase(nic)) {
                log.info(
                        "Skipped pending employee import (already exists): {} / {}",
                        employeeNo,
                        nic
                );
                skipped++;
                continue;
            }

            try {
                request.setCareerHistory(null);
                Employee employee = employeeService.createEmployee(request);
                log.info(
                        "Created pending employee: {} ({}) [id={}]",
                        employee.getEmployeeNo(),
                        employee.getFullName(),
                        employee.getId()
                );
                created++;
            } catch (RuntimeException ex) {
                log.error(
                        "Failed to import pending employee {} ({}): {}",
                        employeeNo,
                        nic,
                        ex.getMessage()
                );
                failed++;
            }
        }

        log.info(
                "Pending employee import finished: created={}, skipped={}, failed={}",
                created,
                skipped,
                failed
        );
    }

    private List<EmployeeRequest> loadImportData() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        ClassPathResource resource = new ClassPathResource(IMPORT_RESOURCE);
        try (InputStream inputStream = resource.getInputStream()) {
            return mapper.readValue(
                    inputStream,
                    new TypeReference<List<EmployeeRequest>>() {}
            );
        } catch (IOException ex) {
            throw new IllegalStateException(
                    "Failed to load pending employee import data from "
                            + IMPORT_RESOURCE,
                    ex
            );
        }
    }
}
