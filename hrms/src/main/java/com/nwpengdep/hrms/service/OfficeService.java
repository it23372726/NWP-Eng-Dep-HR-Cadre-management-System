package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.OfficeRequest;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.Office;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.OfficeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OfficeService {

    private static final int MAX_NAME_LENGTH = 255;

    private final OfficeRepository officeRepository;
    private final EmployeeRepository employeeRepository;
    private final OrganizationSettingsService organizationSettingsService;

    public Office create(OfficeRequest request) {
        String name = validateName(request.getName());
        String district = requireDistrict(request.getDistrict());

        if (officeRepository.existsByNameIgnoreCaseAndDistrictIgnoreCase(name, district)) {
            throw new RuntimeException(
                    "Office already exists in " + district + ": " + name
            );
        }

        return officeRepository.save(
                Office.builder()
                        .name(name)
                        .district(district)
                        .build()
        );
    }

    public List<Office> getAll(String district) {
        if (district != null && !district.isBlank()) {
            String normalized = organizationSettingsService.normalizeDistrictLabel(district);
            return officeRepository.findByDistrictIgnoreCaseOrderByNameAsc(normalized);
        }
        return officeRepository.findAllByOrderByDistrictAscNameAsc();
    }

    public Office getById(Long id) {
        return officeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Office not found"));
    }

    public Office update(Long id, OfficeRequest request) {
        Office office = getById(id);
        String name = validateName(request.getName());
        String district = requireDistrict(request.getDistrict());

        if (officeRepository.existsByNameIgnoreCaseAndDistrictIgnoreCaseAndIdNot(
                name,
                district,
                id
        )) {
            throw new RuntimeException(
                    "Office already exists in " + district + ": " + name
            );
        }

        office.setName(name);
        office.setDistrict(district);
        return officeRepository.save(office);
    }

    public void delete(Long id) {
        Office office = getById(id);
        long employeeCount = employeeRepository.countByCurrentOfficeIgnoreCaseAndStatus(
                office.getName(),
                EmployeeStatus.ACTIVE
        );
        if (employeeCount > 0) {
            throw new RuntimeException(
                    "Cannot delete office assigned to " + employeeCount + " active employee(s)"
            );
        }
        officeRepository.deleteById(id);
    }

    public void validateNwpWorkplace(String officeName, String district) {
        String primaryDepartment = DepartmentConstants.getPrimaryDepartmentName();
        if (officeName == null || officeName.isBlank()) {
            throw new RuntimeException("Office is required for " + primaryDepartment);
        }
        if (district == null || district.isBlank()) {
            throw new RuntimeException(
                    "Working district is required for " + primaryDepartment
            );
        }

        String normalizedDistrict = requireDistrict(district);
        officeRepository.findByNameIgnoreCaseAndDistrictIgnoreCase(
                        officeName.trim(),
                        normalizedDistrict
                )
                .orElseThrow(() -> new RuntimeException(
                        "Office \"" + officeName.trim() + "\" is not registered in "
                                + normalizedDistrict
                ));
    }

    public void validateNwpWorkplaceIfNwp(
            String department,
            String officeName,
            String district
    ) {
        if (DepartmentConstants.isPrimaryDepartment(department)) {
            validateNwpWorkplace(officeName, district);
        }
    }

    public Optional<String> findDistrictByOfficeName(String officeName) {
        if (officeName == null || officeName.isBlank()) {
            return Optional.empty();
        }
        return officeRepository.findFirstByNameIgnoreCase(officeName.trim())
                .map(Office::getDistrict);
    }

    private String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new RuntimeException("Office name is required");
        }
        String trimmed = name.trim();
        if (trimmed.length() > MAX_NAME_LENGTH) {
            throw new RuntimeException(
                    "Office name must be at most " + MAX_NAME_LENGTH + " characters"
            );
        }
        return trimmed;
    }

    private String requireDistrict(String district) {
        organizationSettingsService.requireConfiguredDistrict(district);
        return organizationSettingsService.normalizeDistrictLabel(district);
    }
}
