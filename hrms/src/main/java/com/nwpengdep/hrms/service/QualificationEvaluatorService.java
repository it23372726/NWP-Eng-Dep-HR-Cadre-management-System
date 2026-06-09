package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class QualificationEvaluatorService {

    public void evaluatePermanentQualification(Employee employee) {
        boolean qualified = isQualifiedForPermanent(employee);
        Boolean wasQualified = employee.getQualifiedForPermanent();

        employee.setQualifiedForPermanent(qualified);

        if (qualified && !Boolean.TRUE.equals(wasQualified)
                && employee.getPermanentQualificationDate() == null) {
            employee.setPermanentQualificationDate(LocalDate.now());
        }

        if (!qualified) {
            employee.setPermanentQualificationDate(null);
        }

        if (employee.getPermanentConfirmationDate() != null) {
            employee.setPermanentStatus(PermanentStatus.PERMANENT);
        } else if (qualified) {
            employee.setPermanentStatus(PermanentStatus.QUALIFIED_FOR_PERMANENT);
        } else {
            employee.setPermanentStatus(PermanentStatus.PROBATION);
        }
    }

    public boolean isQualifiedForPermanent(Employee employee) {
        if (!isPhaseOneApplicable(employee)) {
            return false;
        }

        return Boolean.TRUE.equals(employee.getEbGrade3Passed())
                && Boolean.TRUE.equals(employee.getLanguageQualificationPassed())
                && Boolean.TRUE.equals(employee.getMedicalReportCompleted())
                && educationRequirementsSatisfied(employee)
                && Boolean.TRUE.equals(employee.getBirthCertificateApproved())
                && completedThreeYears(employee);
    }

    public boolean isPhaseOneApplicable(Employee employee) {
        return employee != null
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && employee.getGrade() == Grade.III;
    }

    public LocalDate getThreeYearRequirementDate(Employee employee) {
        if (employee == null || employee.getDateOfFirstAppointment() == null) {
            return null;
        }
        return employee.getDateOfFirstAppointment().plusYears(3);
    }

    public boolean completedThreeYears(Employee employee) {
        LocalDate qualifiedDate = getThreeYearRequirementDate(employee);
        return qualifiedDate != null && !LocalDate.now().isBefore(qualifiedDate);
    }

    private boolean educationRequirementsSatisfied(Employee employee) {
        return Boolean.TRUE.equals(employee.getOlApproved())
                && Boolean.TRUE.equals(employee.getAlApproved())
                && Boolean.TRUE.equals(employee.getDegreeApproved());
    }
}
