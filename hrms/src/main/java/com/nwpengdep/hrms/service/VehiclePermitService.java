package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.VehiclePermitCollectionRequest;
import com.nwpengdep.hrms.dto.VehiclePermitStatusDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VehiclePermitService {

    public static final int VEHICLE_PERMIT_INTERVAL_YEARS = 5;

    private static final Set<EmployeeActionType> SENIOR_CAREER_ACTION_TYPES = EnumSet.of(
            EmployeeActionType.NEW_APPOINTMENT,
            EmployeeActionType.PROMOTION,
            EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
            EmployeeActionType.TRANSFER_IN
    );

    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;

    @Transactional(readOnly = true)
    public VehiclePermitStatusDto getStatus(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return buildStatus(employee);
    }

    @Transactional
    public VehiclePermitStatusDto recordCollection(
            Long employeeId,
            VehiclePermitCollectionRequest request
    ) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Only active employees can record vehicle permit collection"
            );
        }

        VehiclePermitStatusDto status = buildStatus(employee);
        if (!status.isApplicable()) {
            throw new IllegalArgumentException(
                    "Vehicle permit collection applies only to Senior service level employees"
            );
        }

        if (status.getSeniorSinceDate() == null
                && employee.getVehiclePermitCollectedDate() == null) {
            throw new IllegalArgumentException(
                    "Senior start date could not be determined from career history"
            );
        }

        if (!status.isCanCollectNow()) {
            throw new IllegalArgumentException(
                    "Vehicle permit is not yet collectable"
            );
        }

        LocalDate collectedDate = request.getCollectedDate();
        LocalDate today = LocalDate.now();
        LocalDate nextCollectableDate = status.getNextCollectableDate();

        if (collectedDate.isAfter(today)) {
            throw new IllegalArgumentException(
                    "Collection date cannot be in the future"
            );
        }

        if (nextCollectableDate != null && collectedDate.isBefore(nextCollectableDate)) {
            throw new IllegalArgumentException(
                    "Collection date cannot be before the next collectable date"
            );
        }

        LocalDate seniorSinceDate = status.getSeniorSinceDate();
        if (seniorSinceDate != null && collectedDate.isBefore(seniorSinceDate)) {
            throw new IllegalArgumentException(
                    "Collection date cannot be before the employee became Senior"
            );
        }

        employee.setVehiclePermitCollectedDate(collectedDate);
        employeeRepository.save(employee);

        return buildStatus(employee);
    }

    public LocalDate resolveSeniorSinceDate(Long employeeId) {
        List<EmployeeAction> actions = employeeActionRepository
                .findCareerActionsByEmployeeIdOrderByActionDateAsc(
                        employeeId,
                        List.copyOf(SENIOR_CAREER_ACTION_TYPES)
                );

        for (EmployeeAction action : actions) {
            if (isSeniorDesignation(action.getNewDesignation())) {
                return action.getActionDate();
            }
        }

        return null;
    }

    private VehiclePermitStatusDto buildStatus(Employee employee) {
        if (!isSeniorEmployee(employee)) {
            return VehiclePermitStatusDto.builder()
                    .applicable(false)
                    .canCollectNow(false)
                    .build();
        }

        LocalDate seniorSinceDate = resolveSeniorSinceDate(employee.getId());
        LocalDate lastCollectedDate = employee.getVehiclePermitCollectedDate();
        LocalDate nextCollectableDate = resolveNextCollectableDate(
                seniorSinceDate,
                lastCollectedDate
        );
        LocalDate today = LocalDate.now();
        boolean canCollectNow = nextCollectableDate != null
                && !today.isBefore(nextCollectableDate);
        String message = null;

        if (seniorSinceDate == null && lastCollectedDate == null) {
            message = "Senior start date could not be determined from career history";
            canCollectNow = false;
        }

        return VehiclePermitStatusDto.builder()
                .applicable(true)
                .seniorSinceDate(seniorSinceDate)
                .lastCollectedDate(lastCollectedDate)
                .nextCollectableDate(nextCollectableDate)
                .canCollectNow(canCollectNow)
                .message(message)
                .build();
    }

    private LocalDate resolveNextCollectableDate(
            LocalDate seniorSinceDate,
            LocalDate lastCollectedDate
    ) {
        if (lastCollectedDate != null) {
            return lastCollectedDate.plusYears(VEHICLE_PERMIT_INTERVAL_YEARS);
        }
        if (seniorSinceDate != null) {
            return seniorSinceDate.plusYears(VEHICLE_PERMIT_INTERVAL_YEARS);
        }
        return null;
    }

    private boolean isSeniorEmployee(Employee employee) {
        ServiceLevel serviceLevel = employee.getServiceLevel();
        return serviceLevel != null
                && serviceLevel.getLevelName() != null
                && "Senior".equalsIgnoreCase(serviceLevel.getLevelName().trim());
    }

    private boolean isSeniorDesignation(Designation designation) {
        if (designation == null || designation.getServiceLevel() == null) {
            return false;
        }
        String levelName = designation.getServiceLevel().getLevelName();
        return levelName != null && "Senior".equalsIgnoreCase(levelName.trim());
    }
}
