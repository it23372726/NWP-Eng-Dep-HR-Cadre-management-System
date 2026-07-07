package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportRowResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllEmployeeDetailsReportService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public AllEmployeeDetailsReportResponse generateReport() {
        List<Employee> employees = new ArrayList<>(
                employeeRepository.findAllForEmployeeDetailsReport()
                        .stream()
                        .filter(employee -> DepartmentConstants.isNwpEngineering(
                                employee.getCurrentDepartment()
                        ))
                        .toList()
        );
        employees.sort(ReportSortOrder::compareEmployeesForReport);

        List<AllEmployeeDetailsReportRowResponse> rows = employees.stream()
                .map(this::mapToRowResponse)
                .collect(Collectors.toList());

        return AllEmployeeDetailsReportResponse.builder()
                .generatedAt(LocalDateTime.now())
                .totalCount(rows.size())
                .rows(rows)
                .build();
    }

    private AllEmployeeDetailsReportRowResponse mapToRowResponse(Employee employee) {
        Integer serialNo = null;
        if (employee.getEmployeeNo() != null && !employee.getEmployeeNo().isEmpty()) {
            try {
                serialNo = Integer.parseInt(employee.getEmployeeNo());
            } catch (NumberFormatException e) {
                serialNo = null;
            }
        }
        boolean isContract = employee.getEmploymentType() == EmploymentType.CONTRACT;

        return AllEmployeeDetailsReportRowResponse.builder()
                .serialNo(serialNo)
                .employeeName(employee.getFullName() != null ? employee.getFullName() : "—")
                .designation(resolveEmployeeDesignationName(employee))
                .nic(employee.getNic() != null ? employee.getNic() : "—")
                .dateOfBirth(employee.getDateOfBirth())
                .gender(employee.getGender() != null ? employee.getGender() : "—")
                .serviceCategory(isContract ? "—" : (
                        employee.getServiceLevel() != null
                                ? employee.getServiceLevel().getLevelName()
                                : "—"))
                .service(isContract ? "—" : resolveEmployeeServiceCode(employee))
                .salaryCode(isContract ? "—" : (
                        employee.getDesignation() != null
                                ? employee.getDesignation().getSalaryCode()
                                : "—"))
                .grade(isContract ? "—" : (
                        employee.getGrade() != null ? employee.getGrade().name() : "—"))
                .natureOfAppointment(formatNatureOfAppointment(employee))
                .dateOfFirstAppointment(isContract ? null : employee.getDateOfFirstAppointment())
                .incremantDate(employee.getIncremantDate() != null ? employee.getIncremantDate() : "—")
                .enteredDateToAllIslandService(employee.getEnteredDateToAllIslandService())
                .reportedDateToPresentWorkingPlace(employee.getReportedDateToPresentWorkingPlace())
                .currentWorkingPlace(employee.getCurrentWorkingPlace() != null ? employee.getCurrentWorkingPlace() : "—")
                .currentDistrictOfWorking(employee.getCurrentDistrictOfWorking() != null ? employee.getCurrentDistrictOfWorking().name() : "—")
                .appointmentDateToPresentClassGrade(
                        isContract ? null : employee.getAppointmentDateToPresentClassGrade())
                .enteredDateToNWPCouncil(employee.getEnteredDateToNWPCouncil())
                .permanentAddress(employee.getPermanentAddress() != null ? employee.getPermanentAddress() : "—")
                .residentDistrict(employee.getResidentDistrict() != null ? employee.getResidentDistrict() : "—")
                .contactNo(employee.getContactNo() != null ? employee.getContactNo() : "—")
                .build();
    }

    private String formatNatureOfAppointment(Employee employee) {
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return "Training";
        }

        EmploymentType employmentType = employee.getEmploymentType();
        if (employmentType == null) {
            return "—";
        }

        return switch (employmentType) {
            case PERMANENT -> "Permanent";
            case ACTING -> "Acting";
            case CASUAL -> "Casual";
            case SUBSTITUTE -> "Substitute";
            case CONTRACT -> "Contract";
        };
    }

    private String resolveEmployeeDesignationName(Employee employee) {
        if (employee.getSpecialDesignationName() != null
                && !employee.getSpecialDesignationName().isBlank()) {
            return employee.getSpecialDesignationName();
        }
        if (employee.getRecordedDesignationName() != null
                && !employee.getRecordedDesignationName().isBlank()) {
            return employee.getRecordedDesignationName();
        }
        if (employee.getDesignation() != null) {
            return employee.getDesignation().getDesignationName();
        }
        return "—";
    }

    private String resolveEmployeeServiceCode(Employee employee) {
        if (employee.getDesignation() != null
                && employee.getDesignation().getService() != null) {
            return employee.getDesignation().getService().getServiceCode();
        }
        if (employee.getService() != null) {
            return employee.getService().getServiceCode();
        }
        return "—";
    }
}
