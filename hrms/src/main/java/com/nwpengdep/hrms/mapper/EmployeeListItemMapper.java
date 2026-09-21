package com.nwpengdep.hrms.mapper;

import com.nwpengdep.hrms.dto.EmployeeListItemResponse;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;

import java.util.Collections;
import java.util.List;

/**
 * Maps a loaded {@link Employee} to the slim list DTO without walking
 * spouse/children or service requirement catalogs.
 */
public final class EmployeeListItemMapper {

    private EmployeeListItemMapper() {
    }

    public static EmployeeListItemResponse toListItem(Employee employee) {
        if (employee == null) {
            return null;
        }

        return EmployeeListItemResponse.builder()
                .id(employee.getId())
                .employeeNo(employee.getEmployeeNo())
                .fullName(employee.getFullName())
                .nic(employee.getNic())
                .status(employee.getStatus())
                .grade(employee.getGrade())
                .employmentType(employee.getEmploymentType())
                .permanentStatus(employee.getPermanentStatus())
                .profilePhotoPath(employee.getProfilePhotoPath())
                .dateOfBirth(employee.getDateOfBirth())
                .dateOfFirstAppointment(employee.getDateOfFirstAppointment())
                .contactNo(employee.getContactNo())
                .currentDepartment(employee.getCurrentDepartment())
                .currentOffice(employee.getCurrentOffice())
                .currentWorkingPlace(employee.getCurrentWorkingPlace())
                .currentDistrictOfWorking(employee.getCurrentDistrictOfWorking())
                .recordedDesignationName(employee.getRecordedDesignationName())
                .specialDesignationName(employee.getSpecialDesignationName())
                .transferredFrom(employee.getTransferredFrom())
                .designation(mapDesignation(employee.getDesignation()))
                .service(mapService(employee.getService()))
                .serviceLevel(mapServiceLevel(employee.getServiceLevel()))
                .careerProgression(mapCareer(employee.getCareerProgression()))
                .requirements(mapRequirements(employee.getRequirements()))
                .privateVehicleUsedForGovWork(employee.getPrivateVehicleUsedForGovWork())
                .privateVehicleExpireDate(employee.getPrivateVehicleExpireDate())
                .privateVehicleRented(employee.getPrivateVehicleRented())
                .incremantDate(employee.getIncremantDate())
                .salaryIncrementLastDueYear(employee.getSalaryIncrementLastDueYear())
                .salaryIncrementDoneDate(employee.getSalaryIncrementDoneDate())
                .build();
    }

    public static List<EmployeeListItemResponse> toListItems(List<Employee> employees) {
        if (employees == null || employees.isEmpty()) {
            return List.of();
        }
        return employees.stream().map(EmployeeListItemMapper::toListItem).toList();
    }

    private static EmployeeListItemResponse.DesignationRef mapDesignation(
            Designation designation
    ) {
        if (designation == null) {
            return null;
        }
        return EmployeeListItemResponse.DesignationRef.builder()
                .id(designation.getId())
                .designationName(designation.getDesignationName())
                .build();
    }

    private static EmployeeListItemResponse.ServiceRef mapService(ServiceType service) {
        if (service == null) {
            return null;
        }
        return EmployeeListItemResponse.ServiceRef.builder()
                .id(service.getId())
                .serviceCode(service.getServiceCode())
                .description(service.getDescription())
                .build();
    }

    private static EmployeeListItemResponse.ServiceLevelRef mapServiceLevel(
            ServiceLevel serviceLevel
    ) {
        if (serviceLevel == null) {
            return null;
        }
        return EmployeeListItemResponse.ServiceLevelRef.builder()
                .id(serviceLevel.getId())
                .levelName(serviceLevel.getLevelName())
                .build();
    }

    private static EmployeeListItemResponse.CareerProgressionRef mapCareer(
            EmployeeCareerProgression career
    ) {
        if (career == null) {
            return null;
        }
        return EmployeeListItemResponse.CareerProgressionRef.builder()
                .qualifiedForPermanent(career.getQualifiedForPermanent())
                .qualifiedForGrade2(career.getQualifiedForGrade2())
                .qualifiedForGrade1(career.getQualifiedForGrade1())
                .qualifiedForSupra(career.getQualifiedForSupra())
                .qualifiedForSpecial(career.getQualifiedForSpecial())
                .build();
    }

    private static List<EmployeeListItemResponse.RequirementRef> mapRequirements(
            List<EmployeeRequirement> requirements
    ) {
        if (requirements == null || requirements.isEmpty()) {
            return Collections.emptyList();
        }
        return requirements.stream()
                .map(requirement -> EmployeeListItemResponse.RequirementRef.builder()
                        .requirementType(requirement.getRequirementType())
                        .requirementName(requirement.getRequirementName())
                        .status(requirement.getStatus())
                        .build())
                .toList();
    }
}
