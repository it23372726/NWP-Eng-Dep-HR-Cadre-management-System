package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceGrade1Requirement;
import com.nwpengdep.hrms.entity.ServiceGrade2Requirement;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceSpecialRequirement;
import com.nwpengdep.hrms.entity.ServiceSupraRequirement;
import com.nwpengdep.hrms.entity.ServiceType;

@Service
public class CareerProgressionService {

    public static final int PROBATION_YEARS = 3;

    public void recalculateEmployeeCareer(Employee employee) {
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            return;
        }
        syncDesignationRules(employee);
        calculatePermanentEligibility(employee);
        calculateGrade2Eligibility(employee);
        calculateGrade1Eligibility(employee);
        calculateSupraEligibility(employee);
        calculateSpecialEligibility(employee);
    }

    private void calculateSupraEligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        ServiceType service = resolveService(employee);
        if (!serviceAllowsSupra(service)) {
            progression.setSupraRequiredYears(null);
            progression.setSupraEligibilityDate(null);
            progression.setQualifiedForSupra(false);
            return;
        }

        progression.setSupraRequiredYears(
                normalizeRequiredYears(service.getSupraRequiredYears())
        );
        LocalDate eligibilityDate = calculateSupraEligibilityDate(employee);
        progression.setSupraEligibilityDate(eligibilityDate);
        progression.setQualifiedForSupra(
                employee.getGrade() == Grade.SUPRA
                        || (employee.getGrade() == Grade.I
                        && eligibilityDate != null
                        && !LocalDate.now().isBefore(eligibilityDate)
                        && supraRequirementsSatisfied(employee))
        );
    }

    private void calculateSpecialEligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        ServiceType service = resolveService(employee);
        if (!serviceAllowsSpecial(service)) {
            progression.setSpecialRequiredYears(null);
            progression.setSpecialEligibilityDate(null);
            progression.setQualifiedForSpecial(false);
            return;
        }

        progression.setSpecialRequiredYears(
                normalizeRequiredYears(service.getSpecialRequiredYears())
        );
        LocalDate eligibilityDate = calculateSpecialEligibilityDate(employee);
        progression.setSpecialEligibilityDate(eligibilityDate);
        progression.setQualifiedForSpecial(
                employee.getGrade() == Grade.SPECIAL
                        || (employee.getGrade() == Grade.I
                        && eligibilityDate != null
                        && !LocalDate.now().isBefore(eligibilityDate)
                        && specialRequirementsSatisfied(employee))
        );
    }

    private void syncDesignationRules(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        ServiceType service = resolveService(employee);

        if (service == null) {
            return;
        }

        progression.setGrade2RequiredYears(
                normalizeRequiredYears(service.getGrade2RequiredYears())
        );
        progression.setGrade1RequiredYears(
                normalizeRequiredYears(service.getGrade1RequiredYears())
        );
        progression.setSupraRequiredYears(
                serviceAllowsSupra(service)
                        ? normalizeRequiredYears(service.getSupraRequiredYears())
                        : null
        );
        progression.setSpecialRequiredYears(
                serviceAllowsSpecial(service)
                        ? normalizeRequiredYears(service.getSpecialRequiredYears())
                        : null
        );
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
                hasAchievedGrade(employee, Grade.II)
                        || isQualifiedForGrade2(employee, eligibilityDate)
        );
    }

    public void calculateGrade1Eligibility(Employee employee) {
        EmployeeCareerProgression progression = ensureCareerProgression(employee);
        LocalDate eligibilityDate = calculateGrade1EligibilityDate(employee);
        progression.setGrade1EligibilityDate(eligibilityDate);
        progression.setQualifiedForGrade1(
                hasAchievedGrade(employee, Grade.I)
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
                        resolveService(employee) != null
                                ? resolveService(employee).getPermanentRequirements()
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
                        resolveService(employee) != null
                                ? resolveService(employee).getGrade2Requirements()
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

    public boolean isQualifiedForSupraOn(
            Employee employee,
            LocalDate effectiveDate
    ) {
        return isQualifiedForSupraPromotion(
                employee,
                Grade.I,
                Grade.SUPRA,
                effectiveDate
        );
    }

    public boolean isQualifiedForSupraPromotion(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate effectiveDate
    ) {
        if (oldGrade != Grade.I || newGrade != Grade.SUPRA) {
            return true;
        }

        ServiceType service = resolveService(employee);
        if (!serviceAllowsSupra(service)) {
            return false;
        }

        LocalDate eligibilityDate = calculateSupraEligibilityDate(employee);
        return employee != null
                && eligibilityDate != null
                && effectiveDate != null
                && !effectiveDate.isBefore(eligibilityDate)
                && supraRequirementsSatisfied(employee);
    }

    public boolean isQualifiedForSpecialOn(
            Employee employee,
            LocalDate effectiveDate
    ) {
        return isQualifiedForSpecialPromotion(
                employee,
                Grade.I,
                Grade.SPECIAL,
                effectiveDate
        );
    }

    public boolean isQualifiedForSpecialPromotion(
            Employee employee,
            Grade oldGrade,
            Grade newGrade,
            LocalDate effectiveDate
    ) {
        if (oldGrade != Grade.I || newGrade != Grade.SPECIAL) {
            return true;
        }

        ServiceType service = resolveService(employee);
        if (!serviceAllowsSpecial(service)) {
            return false;
        }

        LocalDate eligibilityDate = calculateSpecialEligibilityDate(employee);
        return employee != null
                && eligibilityDate != null
                && effectiveDate != null
                && !effectiveDate.isBefore(eligibilityDate)
                && specialRequirementsSatisfied(employee);
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
            return;
        }

        if (oldGrade == Grade.I && newGrade == Grade.SUPRA) {
            LocalDate minimumDate = calculateSupraEligibilityDate(employee);
            if (minimumDate != null && effectiveDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Effective date cannot be earlier than "
                                + minimumDate
                                + ". Supra promotion requires the service period "
                                + "from Grade I achievement."
                );
            }
            if (!isQualifiedForSupraPromotion(
                    employee,
                    oldGrade,
                    newGrade,
                    effectiveDate
            )) {
                throw new RuntimeException(
                        "Employee does not meet Supra promotion requirements "
                                + "for the selected effective date."
                );
            }
            return;
        }

        if (oldGrade == Grade.I && newGrade == Grade.SPECIAL) {
            LocalDate minimumDate = calculateSpecialEligibilityDate(employee);
            if (minimumDate != null && effectiveDate.isBefore(minimumDate)) {
                throw new RuntimeException(
                        "Effective date cannot be earlier than "
                                + minimumDate
                                + ". Special promotion requires the service period "
                                + "from Grade I achievement."
                );
            }
            if (!isQualifiedForSpecialPromotion(
                    employee,
                    oldGrade,
                    newGrade,
                    effectiveDate
            )) {
                throw new RuntimeException(
                        "Employee does not meet Special promotion requirements "
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

        return getGrade2BaseDate(employee)
                .plusYears(normalizeRequiredYears(getGrade2RequiredYears(employee)));
    }

    public LocalDate calculateGrade1EligibilityDate(Employee employee) {
        LocalDate baseDate = getGrade2AchievedDate(employee);
        if (baseDate == null && employee != null) {
            baseDate = employee.getAppointmentDateToPresentClassGrade();
        }
        if (baseDate == null) {
            return null;
        }

        return baseDate.plusYears(normalizeRequiredYears(getGrade1RequiredYears(employee)));
    }

    public LocalDate calculateSupraEligibilityDate(Employee employee) {
        LocalDate baseDate = getGrade1AchievedDate(employee);
        if (baseDate == null && employee != null) {
            baseDate = employee.getAppointmentDateToPresentClassGrade();
        }
        if (baseDate == null) {
            return null;
        }

        ServiceType service = resolveService(employee);
        if (!serviceAllowsSupra(service)) {
            return null;
        }

        return baseDate.plusYears(
                normalizeRequiredYears(service.getSupraRequiredYears())
        );
    }

    public LocalDate calculateSpecialEligibilityDate(Employee employee) {
        LocalDate baseDate = getGrade1AchievedDate(employee);
        if (baseDate == null && employee != null) {
            baseDate = employee.getAppointmentDateToPresentClassGrade();
        }
        if (baseDate == null) {
            return null;
        }

        ServiceType service = resolveService(employee);
        if (!serviceAllowsSpecial(service)) {
            return null;
        }

        return baseDate.plusYears(
                normalizeRequiredYears(service.getSpecialRequiredYears())
        );
    }

    public LocalDate getMinimumSupraPromotionDate(
            LocalDate grade1AchievedDate,
            ServiceType service
    ) {
        if (grade1AchievedDate == null || service == null || !serviceAllowsSupra(service)) {
            return null;
        }

        return grade1AchievedDate.plusYears(
                normalizeRequiredYears(service.getSupraRequiredYears())
        );
    }

    public LocalDate getMinimumSpecialPromotionDate(
            LocalDate grade1AchievedDate,
            ServiceType service
    ) {
        if (grade1AchievedDate == null || service == null || !serviceAllowsSpecial(service)) {
            return null;
        }

        return grade1AchievedDate.plusYears(
                normalizeRequiredYears(service.getSpecialRequiredYears())
        );
    }

    public boolean serviceAllowsSupra(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SUPRA);
    }

    public boolean serviceAllowsSpecial(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SPECIAL);
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
        return getMinimumGrade2PromotionDate(
                firstAppointmentDate,
                resolveService(designation)
        );
    }

    public LocalDate getMinimumGrade2PromotionDate(
            LocalDate firstAppointmentDate,
            ServiceType service
    ) {
        if (firstAppointmentDate == null || service == null) {
            return null;
        }

        return firstAppointmentDate.plusYears(
                normalizeRequiredYears(service.getGrade2RequiredYears())
        );
    }

    public LocalDate getMinimumGrade1PromotionDate(
            LocalDate grade2AchievedDate,
            Designation designation
    ) {
        return getMinimumGrade1PromotionDate(grade2AchievedDate, resolveService(designation));
    }

    public LocalDate getMinimumGrade1PromotionDate(
            LocalDate grade2AchievedDate,
            ServiceType service
    ) {
        if (grade2AchievedDate == null || service == null) {
            return null;
        }

        return grade2AchievedDate.plusYears(
                normalizeRequiredYears(service.getGrade1RequiredYears())
        );
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
                        resolveService(employee) != null
                                ? resolveService(employee).getGrade2Requirements()
                                : List.of()
                )
                && eligibilityDate != null
                && !LocalDate.now().isBefore(eligibilityDate);
    }

    private boolean impliesPermanentConfirmation(Employee employee) {
        return employee != null
                && employee.getEmploymentType() == EmploymentType.PERMANENT
                && hasAchievedGrade(employee, Grade.II);
    }

    private boolean hasAchievedGrade(Employee employee, Grade minimumGrade) {
        if (employee == null || minimumGrade == null) {
            return false;
        }

        Grade current = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;
        return gradeRank(current) <= gradeRank(minimumGrade);
    }

    private int gradeRank(Grade grade) {
        return switch (grade) {
            case SUPRA -> 0;
            case SPECIAL -> 1;
            case I -> 2;
            case II -> 3;
            case III -> 4;
            case NONE -> 5;
        };
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
                        resolveService(employee) != null
                                ? resolveService(employee).getGrade1Requirements()
                                : List.of()
                );
    }

    private boolean priorPromotionRequirementsSatisfied(Employee employee) {
        if (employee == null) {
            return false;
        }

        ServiceType service = resolveService(employee);
        return isRequirementCompleted(employee, RequirementType.EB_GRADE_3)
                && isRequirementCompleted(employee, RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION)
                && isRequirementCompleted(employee, RequirementType.MEDICAL_REPORT)
                && educationRequirementsSatisfied(employee)
                && isRequirementCompleted(employee, RequirementType.BIRTH_CERTIFICATE)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        service != null ? service.getPermanentRequirements() : List.of()
                )
                && isRequirementCompleted(employee, RequirementType.EB_GRADE_2)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        service != null ? service.getGrade2Requirements() : List.of()
                )
                && grade1RequirementsSatisfied(employee);
    }

    private boolean supraRequirementsSatisfied(Employee employee) {
        if (employee == null || !priorPromotionRequirementsSatisfied(employee)) {
            return false;
        }

        ServiceType service = resolveService(employee);
        return isRequirementCompleted(employee, RequirementType.SUPRA_REQUIREMENT)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_SUPRA_REQUIREMENT,
                        service != null ? service.getSupraRequirements() : List.of()
                );
    }

    private boolean specialRequirementsSatisfied(Employee employee) {
        if (employee == null || !priorPromotionRequirementsSatisfied(employee)) {
            return false;
        }

        ServiceType service = resolveService(employee);
        return isRequirementCompleted(employee, RequirementType.MASTERS_DEGREE)
                && customRequirementsCompleted(
                        employee,
                        RequirementType.CUSTOM_SPECIAL_REQUIREMENT,
                        service != null ? service.getSpecialRequirements() : List.of()
                );
    }

    private Integer getGrade2RequiredYears(Employee employee) {
        ServiceType service = resolveService(employee);
        if (service != null && service.getGrade2RequiredYears() != null) {
            return service.getGrade2RequiredYears();
        }
        return ensureCareerProgression(employee).getGrade2RequiredYears();
    }

    private Integer getGrade1RequiredYears(Employee employee) {
        ServiceType service = resolveService(employee);
        if (service != null && service.getGrade1RequiredYears() != null) {
            return service.getGrade1RequiredYears();
        }
        return ensureCareerProgression(employee).getGrade1RequiredYears();
    }

    private int normalizeRequiredYears(Integer years) {
        return years != null ? years : 0;
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
        if (definition instanceof ServicePermanentRequirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof ServiceGrade2Requirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof ServiceGrade1Requirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof ServiceSupraRequirement requirement) {
            return requirement.getRequirementName();
        }
        if (definition instanceof ServiceSpecialRequirement requirement) {
            return requirement.getRequirementName();
        }
        return null;
    }

    private ServiceType resolveService(Employee employee) {
        if (employee == null) {
            return null;
        }
        if (employee.getDesignation() != null
                && employee.getDesignation().getService() != null) {
            return employee.getDesignation().getService();
        }
        return employee.getService();
    }

    private ServiceType resolveService(Designation designation) {
        if (designation == null) {
            return null;
        }
        return designation.getService();
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
