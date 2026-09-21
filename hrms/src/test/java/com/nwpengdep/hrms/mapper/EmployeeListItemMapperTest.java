package com.nwpengdep.hrms.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nwpengdep.hrms.dto.EmployeeListItemResponse;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceType;

class EmployeeListItemMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Test
    void mapsFilterFieldsAndOmitsHeavyAssociationsFromJson() throws Exception {
        ServiceType service = ServiceType.builder()
                .id(10L)
                .serviceCode("SLAS")
                .description("Sri Lanka Administrative Service")
                .permanentRequirements(new HashSet<>(List.of(
                        ServicePermanentRequirement.builder()
                                .requirementName("Should not appear")
                                .build()
                )))
                .build();

        Designation designation = Designation.builder()
                .id(20L)
                .designationName("Engineer")
                .service(service)
                .allowedGrades(new HashSet<>(List.of(Grade.III)))
                .build();

        EmployeeSpouse spouse = EmployeeSpouse.builder()
                .fullName("Spouse Name")
                .build();

        EmployeeChild child = EmployeeChild.builder()
                .fullName("Child Name")
                .birthCertificateNo("BC-1")
                .build();

        EmployeeCareerProgression career = EmployeeCareerProgression.builder()
                .qualifiedForPermanent(true)
                .qualifiedForGrade2(true)
                .qualifiedForGrade1(false)
                .qualifiedForSupra(false)
                .qualifiedForSpecial(true)
                .build();

        EmployeeRequirement requirement = EmployeeRequirement.builder()
                .requirementType(RequirementType.CUSTOM_PERMANENT_REQUIREMENT)
                .requirementName("Probation certificate")
                .status(RequirementStatus.COMPLETED)
                .build();

        Employee employee = Employee.builder()
                .id(1L)
                .employeeNo("E001")
                .fullName("Ada Lovelace")
                .nic("900101123V")
                .status(EmployeeStatus.ACTIVE)
                .grade(Grade.III)
                .employmentType(EmploymentType.PERMANENT)
                .permanentStatus(PermanentStatus.PROBATION)
                .profilePhotoPath("/photos/1.jpg")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .dateOfFirstAppointment(LocalDate.of(2015, 5, 1))
                .currentDepartment("NWP Engineering")
                .currentOffice("Head Office")
                .currentWorkingPlace("Kurunegala")
                .currentDistrictOfWorking("Kurunegala")
                .recordedDesignationName("Recorded Engineer")
                .specialDesignationName(null)
                .transferredFrom("Previous Department")
                .designation(designation)
                .service(service)
                .serviceLevel(ServiceLevel.builder().id(3L).levelName("Class III").build())
                .careerProgression(career)
                .requirements(List.of(requirement))
                .spouse(spouse)
                .children(List.of(child))
                .build();

        employee.setContactNo("0771234567");
        employee.setPrivateVehicleUsedForGovWork(true);
        employee.setPrivateVehicleExpireDate(LocalDate.of(2026, 12, 31));
        employee.setPrivateVehicleRented(false);
        employee.setIncremantDate("01");
        employee.setSalaryIncrementLastDueYear(2025);
        employee.setSalaryIncrementDoneDate(LocalDate.of(2025, 1, 15));

        EmployeeListItemResponse dto = EmployeeListItemMapper.toListItem(employee);
        JsonNode json = objectMapper.valueToTree(dto);

        assertEquals(1L, dto.getId());
        assertEquals("E001", dto.getEmployeeNo());
        assertEquals("Ada Lovelace", dto.getFullName());
        assertEquals("900101123V", dto.getNic());
        assertEquals(EmployeeStatus.ACTIVE, dto.getStatus());
        assertEquals(Grade.III, dto.getGrade());
        assertEquals(EmploymentType.PERMANENT, dto.getEmploymentType());
        assertEquals(PermanentStatus.PROBATION, dto.getPermanentStatus());
        assertEquals("/photos/1.jpg", dto.getProfilePhotoPath());
        assertEquals(LocalDate.of(1990, 1, 1), dto.getDateOfBirth());
        assertEquals(LocalDate.of(2015, 5, 1), dto.getDateOfFirstAppointment());
        assertEquals("0771234567", dto.getContactNo());
        assertEquals("NWP Engineering", dto.getCurrentDepartment());
        assertEquals("Head Office", dto.getCurrentOffice());
        assertEquals("Kurunegala", dto.getCurrentWorkingPlace());
        assertEquals("Kurunegala", dto.getCurrentDistrictOfWorking());
        assertEquals("Recorded Engineer", dto.getRecordedDesignationName());
        assertNull(dto.getSpecialDesignationName());
        assertEquals("Previous Department", dto.getTransferredFrom());

        assertNotNull(dto.getDesignation());
        assertEquals(20L, dto.getDesignation().getId());
        assertEquals("Engineer", dto.getDesignation().getDesignationName());

        assertNotNull(dto.getService());
        assertEquals(10L, dto.getService().getId());
        assertEquals("SLAS", dto.getService().getServiceCode());
        assertEquals("Sri Lanka Administrative Service", dto.getService().getDescription());

        assertNotNull(dto.getServiceLevel());
        assertEquals(3L, dto.getServiceLevel().getId());
        assertEquals("Class III", dto.getServiceLevel().getLevelName());

        assertNotNull(dto.getCareerProgression());
        assertTrue(dto.getCareerProgression().getQualifiedForPermanent());
        assertTrue(dto.getCareerProgression().getQualifiedForGrade2());
        assertFalse(dto.getCareerProgression().getQualifiedForGrade1());
        assertFalse(dto.getCareerProgression().getQualifiedForSupra());
        assertTrue(dto.getCareerProgression().getQualifiedForSpecial());

        assertEquals(1, dto.getRequirements().size());
        assertEquals(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                dto.getRequirements().get(0).getRequirementType()
        );
        assertEquals("Probation certificate", dto.getRequirements().get(0).getRequirementName());
        assertEquals(RequirementStatus.COMPLETED, dto.getRequirements().get(0).getStatus());

        assertEquals(true, dto.getPrivateVehicleUsedForGovWork());
        assertEquals(LocalDate.of(2026, 12, 31), dto.getPrivateVehicleExpireDate());
        assertEquals(false, dto.getPrivateVehicleRented());
        assertEquals("01", dto.getIncremantDate());
        assertEquals(2025, dto.getSalaryIncrementLastDueYear());
        assertEquals(LocalDate.of(2025, 1, 15), dto.getSalaryIncrementDoneDate());

        assertFalse(json.has("spouse"));
        assertFalse(json.has("children"));
        assertFalse(json.path("designation").has("service"));
        assertFalse(json.path("designation").has("allowedGrades"));
        assertFalse(json.path("service").has("permanentRequirements"));
        assertFalse(json.path("service").has("grade2Requirements"));
        assertFalse(json.path("service").has("allowedGrades"));
        assertFalse(json.path("careerProgression").has("permanentQualificationDate"));
        assertFalse(json.path("requirements").get(0).has("completedDate"));
    }
}
