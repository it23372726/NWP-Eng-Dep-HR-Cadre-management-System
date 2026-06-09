package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.ServiceLevelRequest;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.ServiceLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceLevelService {

    private static final int MAX_LENGTH = 100;

    private final ServiceLevelRepository serviceLevelRepository;
    private final DesignationRepository designationRepository;

    public ServiceLevel create(ServiceLevelRequest request) {
        String levelName = validateLevelName(request.getLevelName());

        if (serviceLevelRepository.existsByLevelNameIgnoreCase(levelName)) {
            throw new RuntimeException(
                    "Service level already exists: " + levelName
            );
        }

        return serviceLevelRepository.save(
                ServiceLevel.builder()
                        .levelName(levelName)
                        .build()
        );
    }

    public List<ServiceLevel> getAll() {
        return serviceLevelRepository.findAll();
    }

    public ServiceLevel getById(Long id) {
        return serviceLevelRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Service level not found"));
    }

    public ServiceLevel update(Long id, ServiceLevelRequest request) {
        ServiceLevel serviceLevel = getById(id);
        String levelName = validateLevelName(request.getLevelName());

        if (serviceLevelRepository.existsByLevelNameIgnoreCaseAndIdNot(
                levelName,
                id
        )) {
            throw new RuntimeException(
                    "Service level already exists: " + levelName
            );
        }

        serviceLevel.setLevelName(levelName);
        return serviceLevelRepository.save(serviceLevel);
    }

    public void delete(Long id) {
        validateServiceLevelCanDelete(id);
        serviceLevelRepository.deleteById(id);
    }

    public ServiceLevel resolve(Long serviceLevelId) {
        return serviceLevelRepository.findById(serviceLevelId)
                .orElseThrow(() ->
                        new RuntimeException("Service level not found"));
    }

    private void validateServiceLevelCanDelete(Long id) {
        ServiceLevel serviceLevel = getById(id);

        long employeeCount = serviceLevelRepository.countEmployeesByServiceLevelId(id, EmployeeStatus.ACTIVE);
        long designationCount = designationRepository.countByServiceLevelId(id);

        if (employeeCount > 0 || designationCount > 0) {
            StringBuilder message = new StringBuilder(
                    "Cannot delete service level \"" + serviceLevel.getLevelName() + "\" because it is currently used in the system."
            );

            if (employeeCount > 0) {
                message.append(" It is assigned to ").append(employeeCount).append(" active employee(s).");
            }

            if (designationCount > 0) {
                message.append(" It is used by ").append(designationCount).append(" designation(s).");
            }

            throw new RuntimeException(message.toString());
        }
    }

    private String validateLevelName(String levelName) {
        if (levelName == null || levelName.isBlank()) {
            throw new RuntimeException("Level name is required");
        }

        String trimmed = levelName.trim();

        if (trimmed.length() > MAX_LENGTH) {
            throw new RuntimeException(
                    "Level name must not exceed " + MAX_LENGTH + " characters"
            );
        }

        return trimmed;
    }
}
