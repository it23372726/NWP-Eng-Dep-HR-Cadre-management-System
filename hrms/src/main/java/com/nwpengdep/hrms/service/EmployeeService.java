package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final QualificationEvaluatorService qualificationEvaluatorService;

    @Transactional
    public Employee createEmployee(EmployeeRequest request) {
        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            if (request.getTransferredFrom() == null
                    || request.getTransferredFrom().isBlank()) {
                throw new RuntimeException(
                        "Transferred from is required for transfer-in employees"
                );
            }
        }

        Designation designation = resolveDesignation(request.getDesignationId());
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        Employee employee = mapRequestToEmployee(
                new Employee(),
                request,
                designation,
                serviceLevel
        );

        employee.setStatus(EmployeeStatus.ACTIVE);
        qualificationEvaluatorService.evaluatePermanentQualification(employee);

        designationAssignmentValidator.validate(employee, designation);

        employee = employeeRepository.save(employee);

        EmployeePosting initialPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(designation)
                .startDate(request.getReportedDateToPresentWorkingPlace())
                .currentPosting(true)
                .build();

        postingRepository.save(initialPosting);

        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            employee.setTransferredFrom(request.getTransferredFrom().trim());
            employeeRepository.save(employee);

            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.TRANSFER_IN,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    request.getTransferredFrom().trim(),
                    null,
                    null,
                    request.getRemarks()
            );
        } else {
            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.NEW_APPOINTMENT,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    null,
                    null,
                    null,
                    request.getRemarks()
            );
        }

        return employee;
    }

    public List<Employee> getActiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
    }

    public List<Employee> getInactiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.INACTIVE);
    }

    public List<Employee> getAllEmployees() {
        return getActiveEmployees();
    }

    @Transactional
    public Employee getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        qualificationEvaluatorService.evaluatePermanentQualification(employee);
        return employeeRepository.save(employee);
    }

    public void deleteEmployee(Long id) {
        throw new RuntimeException(
                "Employees cannot be deleted. Use lifecycle actions instead."
        );
    }

    @Transactional
    public Employee updateEmployee(Long id, EmployeeUpdateRequest request) {
        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        Designation designation = resolveDesignation(request.getDesignationId());

        if (employee.getDesignation() == null
                || !designation.getId().equals(employee.getDesignation().getId())) {
            throw new RuntimeException(
                    "Designation changes must be done through promotion"
            );
        }

        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        mapUpdateRequestToEmployee(
                employee,
                request,
                designation,
                serviceLevel
        );

        qualificationEvaluatorService.evaluatePermanentQualification(employee);

        designationAssignmentValidator.validate(employee, designation);

        return employeeRepository.save(employee);
    }

    public List<Employee> searchActiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.ACTIVE
                );
    }

    public List<Employee> searchInactiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.INACTIVE
                );
    }

    public List<Employee> searchEmployees(String keyword) {
        return searchActiveEmployees(keyword);
    }

    public Page<Employee> getEmployeesPaginated(int page, int size) {
        return employeeRepository.findAll(PageRequest.of(page, size));
    }

    private void mapUpdateRequestToEmployee(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setIncremantDate(request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        employee.setCurrentDistrictOfWorking(
                request.getCurrentDistrictOfWorking()
        );
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved()
        );
    }

    private Employee mapRequestToEmployee(
            Employee employee,
            EmployeeRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setIncremantDate(request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        employee.setCurrentDistrictOfWorking(
                request.getCurrentDistrictOfWorking()
        );
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved()
        );

        return employee;
    }

    private Grade resolveGrade(EmploymentType employmentType, Grade grade) {
        if (employmentType != EmploymentType.PERMANENT) {
            return Grade.NONE;
        }
        return grade != null ? grade : Grade.NONE;
    }

    private void applyQualificationFields(
            Employee employee,
            Boolean ebGrade3Passed,
            Boolean languageQualificationPassed,
            Boolean medicalReportCompleted,
            Boolean olApproved,
            Boolean alApproved,
            Boolean degreeApproved,
            String otherQualificationName,
            Boolean otherQualificationApproved,
            Boolean birthCertificateApproved
    ) {
        employee.setEbGrade3Passed(Boolean.TRUE.equals(ebGrade3Passed));
        employee.setLanguageQualificationPassed(Boolean.TRUE.equals(languageQualificationPassed));
        employee.setMedicalReportCompleted(Boolean.TRUE.equals(medicalReportCompleted));
        employee.setOlApproved(Boolean.TRUE.equals(olApproved));
        employee.setAlApproved(Boolean.TRUE.equals(alApproved));
        employee.setDegreeApproved(Boolean.TRUE.equals(degreeApproved));
        employee.setOtherQualificationName(
                otherQualificationName != null && !otherQualificationName.isBlank()
                        ? otherQualificationName.trim()
                        : null
        );
        employee.setOtherQualificationApproved(Boolean.TRUE.equals(otherQualificationApproved));
        employee.setBirthCertificateApproved(Boolean.TRUE.equals(birthCertificateApproved));
    }

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
