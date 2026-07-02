package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.dto.EmployeeDependentDetailsReportResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeChild;
import com.nwpengdep.hrms.entity.EmployeeSpouse;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeDependentDetailsReportService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public EmployeeDependentDetailsReportResponse generateReport(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (!isMarried(employee.getMaritalStatus())) {
            throw new RuntimeException(
                    "Dependent details reports are only available for married employees"
            );
        }

        return EmployeeDependentDetailsReportResponse.builder()
                .employeeName(nvl(employee.getFullName()))
                .employeeNo(nvl(employee.getEmployeeNo()))
                .nic(nvl(employee.getNic()))
                .dateOfBirth(employee.getDateOfBirth())
                .gender(nvl(employee.getGender()))
                .maritalStatus(nvl(employee.getMaritalStatus()))
                .contactNo(nvl(employee.getContactNo()))
                .emailAddress(nvl(employee.getEmailAddress()))
                .permanentAddress(nvl(employee.getPermanentAddress()))
                .spouse(mapSpouse(employee.getSpouse()))
                .children(mapChildren(employee.getChildren()))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private EmployeeDependentDetailsReportResponse.SpouseDetails mapSpouse(
            EmployeeSpouse spouse
    ) {
        if (spouse == null) {
            return null;
        }

        return EmployeeDependentDetailsReportResponse.SpouseDetails.builder()
                .nic(nvl(spouse.getNic()))
                .fullName(nvl(spouse.getFullName()))
                .dateOfBirth(spouse.getDateOfBirth())
                .build();
    }

    private List<EmployeeDependentDetailsReportResponse.ChildDetails> mapChildren(
            List<EmployeeChild> children
    ) {
        if (children == null || children.isEmpty()) {
            return Collections.emptyList();
        }

        return children.stream()
                .map(child -> EmployeeDependentDetailsReportResponse.ChildDetails.builder()
                        .nic(nvl(child.getNic()))
                        .birthCertificateNo(nvl(child.getBirthCertificateNo()))
                        .fullName(nvl(child.getFullName()))
                        .dateOfBirth(child.getDateOfBirth())
                        .relationship(child.getRelationship())
                        .build())
                .collect(Collectors.toList());
    }

    private boolean isMarried(String maritalStatus) {
        return maritalStatus != null
                && "married".equalsIgnoreCase(maritalStatus.trim());
    }

    private static String nvl(String value) {
        return value != null && !value.isBlank() ? value : "—";
    }
}
