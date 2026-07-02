package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.ChildRelationship;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDependentDetailsReportResponse {

    private String employeeName;

    private String employeeNo;

    private String nic;

    private LocalDate dateOfBirth;

    private String gender;

    private String maritalStatus;

    private String contactNo;

    private String emailAddress;

    private String permanentAddress;

    private SpouseDetails spouse;

    private List<ChildDetails> children;

    private LocalDateTime generatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SpouseDetails {

        private String nic;

        private String fullName;

        private LocalDate dateOfBirth;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChildDetails {

        private String nic;

        private String birthCertificateNo;

        private String fullName;

        private LocalDate dateOfBirth;

        private ChildRelationship relationship;
    }
}
