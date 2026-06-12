package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportRowResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllEmployeeDetailsReportService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public AllEmployeeDetailsReportResponse generateReport() {
        List<Employee> employees = employeeRepository.findAllForEmployeeDetailsReport();

        List<AllEmployeeDetailsReportRowResponse> rows = employees.stream()
                .map(this::mapToRowResponse)
                .sorted((r1, r2) -> Integer.compare(r1.getSerialNo() != null ? r1.getSerialNo() : 0,
                                                     r2.getSerialNo() != null ? r2.getSerialNo() : 0))
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
        var careerProgression = employee.getCareerProgression();

        return AllEmployeeDetailsReportRowResponse.builder()
                .serialNo(serialNo)
                .employeeName(employee.getFullName() != null ? employee.getFullName() : "—")
                .designation(employee.getDesignation() != null ? employee.getDesignation().getDesignationName() : "—")
                .nic(employee.getNic() != null ? employee.getNic() : "—")
                .dateOfBirth(employee.getDateOfBirth())
                .gender(employee.getGender() != null ? employee.getGender() : "—")
                .serviceCategory(employee.getServiceLevel() != null ? employee.getServiceLevel().getLevelName() : "—")
                .service(employee.getDesignation() != null && employee.getDesignation().getService() != null
                        ? employee.getDesignation().getService().getServiceCode() : "—")
                .salaryCode(employee.getDesignation() != null ? employee.getDesignation().getSalaryCode() : "—")
                .grade(employee.getGrade() != null ? employee.getGrade().name() : "—")
                .natureOfAppointment(employee.getEmploymentType() != null ? employee.getEmploymentType().name() : "—")
                .employmentType(employee.getEmploymentType() != null ? employee.getEmploymentType().name() : "—")
                .permanentStatus(employee.getPermanentStatus() != null ? employee.getPermanentStatus().name() : "—")
                .qualifiedForPermanent(careerProgression != null && Boolean.TRUE.equals(careerProgression.getQualifiedForPermanent()) ? "Yes" : "No")
                .permanentQualificationDate(careerProgression != null ? careerProgression.getPermanentQualificationDate() : null)
                .permanentConfirmationDate(careerProgression != null ? careerProgression.getPermanentConfirmationDate() : null)
                .dateOfFirstAppointment(employee.getDateOfFirstAppointment())
                .incremantDate(employee.getIncremantDate() != null ? employee.getIncremantDate() : "—")
                .enteredDateToAllIslandService(employee.getEnteredDateToAllIslandService())
                .reportedDateToPresentWorkingPlace(employee.getReportedDateToPresentWorkingPlace())
                .currentWorkingPlace(employee.getCurrentWorkingPlace() != null ? employee.getCurrentWorkingPlace() : "—")
                .currentDistrictOfWorking(employee.getCurrentDistrictOfWorking() != null ? employee.getCurrentDistrictOfWorking().name() : "—")
                .appointmentDateToPresentClassGrade(employee.getAppointmentDateToPresentClassGrade())
                .enteredDateToNWPCouncil(employee.getEnteredDateToNWPCouncil())
                .permanentAddress(employee.getPermanentAddress() != null ? employee.getPermanentAddress() : "—")
                .residentDistrict(employee.getResidentDistrict() != null ? employee.getResidentDistrict() : "—")
                .contactNo(employee.getContactNo() != null ? employee.getContactNo() : "—")
                .build();
    }
}
