package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.DesignationGrade1Requirement;
import com.nwpengdep.hrms.entity.DesignationGrade2Requirement;
import com.nwpengdep.hrms.entity.DesignationPermanentRequirement;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;

@Service
public class CareerProgressionService {

    public static final int PROBATION_YEARS = 3;

    public void recalculateEmployeeCareer(Employee employee) {
        syncDesignationRules(employee);
        calculatePermanentEligibility(employee);
        calculateGrade2Eligibility(employee);
        calculateGrade1Eligibility(employee);
    }

    private void syncDesignationRules(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        Designation designation = employee.getDesignation();

        if (designation == null) {
            return;
        }

        progression.setGrade2RequiredYears(designation.getGrade2RequiredYears());
        progression.setGrade1RequiredYears(designation.getGrade1RequiredYears());
    }

    public void calculatePermanentEligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        if (impliesPermanentConfirmation(employee)
                && progression.getPermanentConfirmationDate() == null) {
            progression.setPermanentConfirmationDate(
                    employee.getAppointmentDateToPresentClassGrade()
            );
        }

        if (progression.getPermanentConfirmationDate() != null) {
            progression.setGrade3AchievedDate(progression.getPermanentConfirmationDate());
        }

        boolean qualified = isQualifiedForPermanent(employee);
        progression.setQualifiedForPermanent(qualified);
        progression.setPermanentQualificationDate(
                qualified ? calculatePermanentQualificationDate(employee) : null
        );

        if (progression.getPermanentConfirmationDate() != null) {
            employee.setPermanentStatus(PermanentStatus.PERMANENT);
        } else if (qualified) {
            employee.setPermanentStatus(PermanentStatus.QUALIFIED_FOR_PERMANENT);
        } else {
            employee.setPermanentStatus(PermanentStatus.PROBATION);
        }
    }

    public void calculateGrade2Eligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        LocalDate eligibilityDate = calculateGrade2EligibilityDate(employee);
        progression.setGrade2EligibilityDate(eligibilityDate);
        progression.setQualifiedForGrade2(
                employee.getGrade() == Grade.II
                        || isQualifiedForGrade2(employee, eligibilityDate)
        );
    }

    public void calculateGrade1Eligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        LocalDate eligibilityDate = calculateGrade1EligibilityDate(employee);
        progression.setGrade1EligibilityDate(eligibilityDate);
        progression.setQualifiedForGrade1(
                employee.getGrade() == Grade.I
                        || (employee.getGrade() == Grade.II
                        && eligibilityDate != null
                        && !LocalDate.now().isBefore(eligibilityDate)
                        && grade1RequirementsSatisfied(employee))
        );
    }

    public boolean isQualifiedForPermanent(Employee employee) {
        if (impliesPermanentConfirmation(employee)) {
            return true;
        }

        if (!isPhaseOneApplicable(employee)) {
            return false;
        }

        return isRequirementCompleted(employee, RequirementType.EB_GRADE_3)
                && isRequirementCompleted(employee, RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION)
                && isRequirementCompleted(employee, RequirementType.MEDICAL_REPORT)
                && educationRequirementsSatisfied(employee)
                && isRequirementCompleted(employee, RequirementType.BIRTH_CERTIFICATE)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        employee.getDesignation() != null
                                ? employee.getDesignation().getPermanentRequirements()
                                : List.of()
                )
                && completedThreeYears(employee);
    }

    public boolean isQualifiedForGrade2(Employee employee) {
        return isQualifiedForGrade2(employee, calculateGrade2EligibilityDate(employee));
    }

    public boolean isQualifiedForGrade2On(
            Employee employee,
            LocalDate effectiveDate
    ) {
        return isQualifiedForGrade2Promotion(
                employee,
                Grade.III,
                Grade.II,
                effectiveDate
        );
    }

    public boolean isQualifiedForGrade2Promotion(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate effectiveDate
    ) {
        if (oldGrade != Grade.III || newGrade != Grade.II) {
            return true;
        }

        LocalDate eligibilityDate = calculateGrade2EligibilityDate(employee);
        return employee != null
                && isRequirementCompleted(employee, RequirementType.EB_GRADE_2)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        employee.getDesignation() != null
                                ? employee.getDesignation().getGrade2Requirements()
                                : List.of()
                )
                && eligibilityDate != null
                && effectiveDate != null
                && !effectiveDate.isBefore(eligibilityDate);
    }

    public boolean isQualifiedForGrade1On(
            Employee employee,
            LocalDate effectiveDate
    ) {
        return isQualifiedForGrade1Promotion(
                employee,
                Grade.II,
                Grade.I,
                effectiveDate
        );
    }

    public boolean isQualifiedForGrade1Promotion(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate effectiveDate
    ) {
        if (oldGrade != Grade.II || newGrade != Grade.I) {
            return true;
        }

        LocalDate eligibilityDate = calculateGrade1EligibilityDate(employee);
        return employee != null
                && eligibilityDate != null
                && effectiveDate != null
                && !effectiveDate.isBefore(eligibilityDate)
                && grade1RequirementsSatisfied(employee);
    }

    public void validateAssignmentEffectiveDate(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate effectiveDate
    ) {
        if (employee == null || effectiveDate == null) {
            return;
        }

        if (oldGrade == Grade.III && newGrade == Grade.II) {
            LocalDate minimumDate = calculateGrade2EligibilityDate(employee);
            if (minimumDate != null && effectiveDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Effective date cannot be earlier than "
                                + minimumDate
                                + ". Grade II promotion requires the service period "
                                + "counted from the first appointment date."
                );
            }
            if (!isQualifiedForGrade2Promotion(
                    employee,
                    oldGrade,
                    newGrade,
                    effectiveDate
            )) {
                throw new RuntimeException(
                        "Employee does not meet Grade II promotion requirements "
                                + "for the selected effective date."
                );
            }
            return;
        }

        if (oldGrade == Grade.II && newGrade == Grade.I) {
            LocalDate minimumDate = calculateGrade1EligibilityDate(employee);
            if (minimumDate != null && effectiveDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Effective date cannot be earlier than "
                                + minimumDate
                                + ". Grade I promotion requires the service period "
                                + "from Grade II achievement."
                );
            }
            if (!isQualifiedForGrade1Promotion(
                    employee,
                    oldGrade,
                    newGrade,
                    effectiveDate
            )) {
                throw new RuntimeException(
                        "Employee does not meet Grade I promotion requirements "
                                + "for the selected effective date."
                );
            }
        }
    }

    public LocalDate getGrade3AchievedDate(Employee employee) {
        EmployeeCareerProgression progression = employee != null
                ? employee.getCareerProgression()
                : null;
        if (progression == null) {
            return null;
        }
        if (progression.getGrade3AchievedDate() != null) {
            return progression.getGrade3AchievedDate();
        }
        return progression.getPermanentConfirmationDate();
    }

    public LocalDate getGrade2AchievedDate(Employee employee) {
        EmployeeCareerProgression progression = employee != null
                ? employee.getCareerProgression()
                : null;
        return progression != null ? progression.getGrade2AchievedDate() : null;
    }

    public LocalDate getGrade1AchievedDate(Employee employee) {
        EmployeeCareerProgression progression = employee != null
                ? employee.getCareerProgression()
                : null;
        return progression != null ? progression.getGrade1AchievedDate() : null;
    }

    public LocalDate calculateGrade2EligibilityDate(Employee employee) {
        if (employee == null || getGrade2BaseDate(employee) == null) {
            return null;
        }

        Integer requiredYears = getGrade2RequiredYears(employee);
        if (requiredYears == null) {
            return null;
        }

        return getGrade2BaseDate(employee).plusYears(requiredYears);
    }

    public LocalDate calculateGrade1EligibilityDate(Employee employee) {
        LocalDate baseDate = getGrade2AchievedDate(employee);
        if (baseDate == null && employee != null) {
            baseDate = employee.getAppointmentDateToPresentClassGrade();
        }
        if (baseDate == null) {
            return null;
        }

        Integer requiredYears = getGrade1RequiredYears(employee);
        if (requiredYears == null) {
            return null;
        }

        return baseDate.plusYears(requiredYears);
    }

    public LocalDate getMinimumPermanentConfirmationDate(LocalDate firstAppointmentDate) {
        if (firstAppointmentDate == null) {
            return null;
        }
        return firstAppointmentDate.plusYears(PROBATION_YEARS);
    }

    public LocalDate getMinimumGrade2PromotionDate(
            LocalDate firstAppointmentDate,
            Designation designation
    ) {
        if (firstAppointmentDate == null || designation == null) {
            return null;
        }

        Integer requiredYears = designation.getGrade2RequiredYears();
        if (requiredYears == null) {
            return null;
        }

        return firstAppointmentDate.plusYears(requiredYears);
    }

    public LocalDate getMinimumGrade1PromotionDate(
            LocalDate grade2AchievedDate,
            Designation designation
    ) {
        if (grade2AchievedDate == null || designation == null) {
            return null;
        }

        Integer requiredYears = designation.getGrade1RequiredYears();
        if (requiredYears == null) {
            return null;
        }

        return grade2AchievedDate.plusYears(requiredYears);
    }

    public LocalDate getThreeYearRequirementDate(Employee employee) {
        if (employee == null) {
            return null;
        }
        return getMinimumPermanentConfirmationDate(employee.getDateOfFirstAppointment());
    }

    public boolean completedThreeYears(Employee employee) {
        LocalDate qualifiedDate = getThreeYearRequirementDate(employee);
        return qualifiedDate != null && !LocalDate.now().isBefore(qualifiedDate);
    }

    public boolean isRequirementCompleted(Employee employee, RequirementType type) {
        if (employee == null || employee.getRequirements() == null) {
            return false;
        }

        return employee.getRequirements()
                .stream()
                .anyMatch(requirement ->
                        requirement.getRequirementType() == type
                                && requirement.getStatus() == RequirementStatus.COMPLETED
                );
    }

    public EmployeeCareerProgression ensureCareerProgression(Employee employee) {
        if (employee.getCareerProgression() == null) {
            EmployeeCareerProgression progression = new EmployeeCareerProgression();
            progression.setEmployee(employee);
            employee.setCareerProgression(progression);
        }
        return employee.getCareerProgression();
    }

    private boolean isPhaseOneApplicable(Employee employee) {
        return employee != null
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && employee.getGrade() == Grade.III;
    }

    private boolean isQualifiedForGrade2(Employee employee, LocalDate eligibilityDate) {
        return employee != null
                && employee.getGrade() == Grade.III
                && isRequirementCompleted(employee, RequirementType.EB_GRADE_2)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        employee.getDesignation() != null
                                ? employee.getDesignation().getGrade2Requirements()
                                : List.of()
                )
                && eligibilityDate != null
                && !LocalDate.now().isBefore(eligibilityDate);
    }

    private boolean impliesPermanentConfirmation(Employee employee) {
        return employee != null
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && (employee.getGrade() == Grade.II
                || employee.getGrade() == Grade.I
                || employee.getGrade() == Grade.SUPRA
                || employee.getGrade() == Grade.SPECIAL);
    }

    private LocalDate getGrade2BaseDate(Employee employee) {
        // Grade II service is counted from the first appointment date:
        // a permanent recruit serves at Grade III from day one, even though
        // the permanent confirmation happens after the probation period.
        if (employee.getDateOfFirstAppointment() != null) {
            return employee.getDateOfFirstAppointment();
        }
        LocalDate grade3AchievedDate = getGrade3AchievedDate(employee);
        if (grade3AchievedDate != null) {
            return grade3AchievedDate;
        }
        return employee.getAppointmentDateToPresentClassGrade();
    }

    private boolean educationRequirementsSatisfied(Employee employee) {
        return isRequirementCompleted(employee, RequirementType.OL_CERTIFICATE)
                && isRequirementCompleted(employee, RequirementType.AL_CERTIFICATE)
                && isRequirementCompleted(employee, RequirementType.DEGREE_CERTIFICATE);
    }

    private LocalDate calculatePermanentQualificationDate(Employee employee) {
        LocalDate serviceDate = getThreeYearRequirementDate(employee);
        LocalDate latestRequirementDate = latestCompletedDate(
                employee,
                List.of(
                        RequirementType.EB_GRADE_3,
                        RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
                        RequirementType.MEDICAL_REPORT,
                        RequirementType.OL_CERTIFICATE,
                        RequirementType.AL_CERTIFICATE,
                        RequirementType.DEGREE_CERTIFICATE,
                        RequirementType.BIRTH_CERTIFICATE
                )
        );

        if (serviceDate == null) {
            return latestRequirementDate;
        }
        if (latestRequirementDate == null) {
            return serviceDate;
        }
        return serviceDate.isAfter(latestRequirementDate)
                ? serviceDate
                : latestRequirementDate;
    }

    private LocalDate latestCompletedDate(
            Employee employee,
            List<RequirementType> requirementTypes
    ) {
        if (employee == null || employee.getRequirements() == null) {
            return null;
        }

        return employee.getRequirements()
                .stream()
                .filter(requirement ->
                        requirementTypes.contains(requirement.getRequirementType())
                                && requirement.getStatus() == RequirementStatus.COMPLETED
                )
                .map(EmployeeRequirement::getCompletedDate)
                .filter(date -> date != null)
                .max(LocalDate::compareTo)
                .orElse(null);
    }

    private boolean grade1RequirementsSatisfied(Employee employee) {
        if (employee == null) {
            return false;
        }

        return isRequirementCompleted(employee, RequirementType.EB_GRADE_1)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        employee.getDesignation() != null
                                ? employee.getDesignation().getGrade1Requirements()
                                : List.of()
                );
    }

    private Integer getGrade2RequiredYears(Employee employee) {
        if (employee.getDesignation() != null
                && employee.getDesignation().getGrade2RequiredYears() != null) {
            return employee.getDesignation().getGrade2RequiredYears();
        }
        return ensureCareerProgression(employee).getGrade2RequiredYears();
    }

    private Integer getGrade1RequiredYears(Employee employee) {
        if (employee.getDesignation() != null
                && employee.getDesignation().getGrade1RequiredYears() != null) {
            return employee.getDesignation().getGrade1RequiredYears();
        }
        return ensureCareerProgression(employee).getGrade1RequiredYears();
    }

    private boolean customRequirementsCompleted(
            Employee employee,
            RequirementType type,
            java.util.Collection<?> definitions
    ) {
        if (definitions == null || definitions.isEmpty()) {
            return true;
        }

        return definitions.stream()
                .map(this::customRequirementName)
                .filter(name -> name != null && !name.isBlank())
                .allMatch(name -> isRequirementCompleted(employee, type, name));
    }

    private String customRequirementName(Object definition) {
        if (definition instanceof DesignationPermanentRequirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof DesignationGrade2Requirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof DesignationGrade1Requirement requirement) {
            return requirement.getRequirementName();
        }
        return null;
    }

    private boolean isRequirementCompleted(
            Employee employee,
            RequirementType type,
            String requirementName
    ) {
        if (employee == null || employee.getRequirements() == null) {
            return false;
        }

        return employee.getRequirements()
                .stream()
                .anyMatch(requirement ->
                        requirement.getRequirementType() == type
                                && requirement.getStatus() == RequirementStatus.COMPLETED
                                && requirementName.equalsIgnoreCase(
                                        requirement.getRequirementName() != null
                                                ? requirement.getRequirementName()
                                                : ""
                                )
                );
    }
}
