package com.nwpengdep.hrms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class PendingEmployeeImportSupport {

    public static final String PENDING_EMPLOYEES_RESOURCE = "import/pending-employees.json";

    private PendingEmployeeImportSupport() {
    }

    public static Set<String> loadAllowedEmployeeNos() {
        List<EmployeeRequest> requests = loadResource(
                PENDING_EMPLOYEES_RESOURCE,
                new TypeReference<List<EmployeeRequest>>() {}
        );

        return requests.stream()
                .map(EmployeeRequest::getEmployeeNo)
                .filter(employeeNo -> employeeNo != null && !employeeNo.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public static <T> T loadResource(String resourcePath, TypeReference<T> typeReference) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        ClassPathResource resource = new ClassPathResource(resourcePath);
        try (InputStream inputStream = resource.getInputStream()) {
            return mapper.readValue(inputStream, typeReference);
        } catch (IOException ex) {
            throw new IllegalStateException(
                    "Failed to load import data from " + resourcePath,
                    ex
            );
        }
    }
}
