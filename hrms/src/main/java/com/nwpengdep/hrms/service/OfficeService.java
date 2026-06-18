package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.OfficeRequest;
import com.nwpengdep.hrms.entity.District;
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

    public Office create(OfficeRequest request) {
        String name = validateName(request.getName());
        District district = requireDistrict(request.getDistrict());

        if (officeRepository.existsByNameIgnoreCaseAndDistrict(name, district)) {
            throw new RuntimeException(
                    "Office already exists in " + district.getLabel() + ": " + name
            );
        }

        return officeRepository.save(
                Office.builder()
                        .name(name)
                        .district(district)
                        .build()
        );
    }

    public List<Office> getAll(District district) {
        if (district != null) {
            return officeRepository.findByDistrictOrderByNameAsc(district);
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
        District district = requireDistrict(request.getDistrict());

        if (officeRepository.existsByNameIgnoreCaseAndDistrictAndIdNot(name, district, id)) {
            throw new RuntimeException(
                    "Office already exists in " + district.getLabel() + ": " + name
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

    public void validateNwpWorkplace(String officeName, District district) {
        if (officeName == null || officeName.isBlank()) {
            throw new RuntimeException("Office is required for N.W.P. Engineering Department");
        }
        if (district == null) {
            throw new RuntimeException("Working district is required for N.W.P. Engineering Department");
        }

        officeRepository.findByNameIgnoreCaseAndDistrict(officeName.trim(), district)
                .orElseThrow(() -> new RuntimeException(
                        "Office \"" + officeName.trim() + "\" is not registered in "
                                + district.getLabel()
                ));
    }

    public void validateNwpWorkplaceIfNwp(String department, String officeName, District district) {
        if (DepartmentConstants.isNwpEngineering(department)) {
            validateNwpWorkplace(officeName, district);
        }
    }

    public Optional<District> findDistrictByOfficeName(String officeName) {
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

    private District requireDistrict(District district) {
        if (district == null) {
            throw new RuntimeException("District is required");
        }
        return district;
    }
}
