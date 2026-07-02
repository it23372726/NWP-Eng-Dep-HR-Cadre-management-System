import {
    Alert,
    Checkbox,
    Chip,
    FormControlLabel,
    Grid
} from "@mui/material";

import {
    getQualificationSectionConfig,
    isNamedRequirementCompleted,
    requirementKey
} from "../../utils/employeeFormUtils";
import { getEmployeeServiceRules } from "../../constants/hrms";
import FormSection from "../FormSection";

const FIXED_REQUIREMENT_FIELD_NAMES = {
    EB_GRADE_3: "ebGrade3Passed",
    GOVERNMENT_LANGUAGE_QUALIFICATION: "languageQualificationPassed",
    MEDICAL_REPORT: "medicalReportCompleted",
    OL_CERTIFICATE: "olApproved",
    AL_CERTIFICATE: "alApproved",
    DEGREE_CERTIFICATE: "degreeApproved",
    BIRTH_CERTIFICATE: "birthCertificateApproved",
    EB_GRADE_2: "ebGrade2Passed",
    EB_GRADE_1: "ebGrade1Passed"
};

export default function EmployeeQualificationsSection({
    formData,
    designation,
    employee,
    handleChange,
    grade,
    permanentConfirmed
}) {
    const config = getQualificationSectionConfig(grade, permanentConfirmed);

    if (!config) {
        return null;
    }

    if (config.allCompleted) {
        return (
            <FormSection title={config.title} description={config.description}>
                <Alert severity="info">
                    Requirements for earlier career stages are automatically
                    marked as completed based on the employee&apos;s career
                    history.
                </Alert>
            </FormSection>
        );
    }

    const service = getEmployeeServiceRules(employee)
        ?? (designation ? getEmployeeServiceRules({ designation }) : null);
    const customRequirements = service?.[config.customField] || [];

    return (
        <FormSection title={config.title} description={config.description}>
            {config.showGrade2Years
                && service?.grade2RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade II: ${service.grade2RequiredYears} year(s) from first appointment date`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            {config.showGrade1Years
                && service?.grade1RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade I: ${service.grade1RequiredYears} year(s) from present class / grade date`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            <Grid container spacing={1.5}>
                {config.fixedRequirements.map(({ requirementType, label }) => {
                    const fieldName =
                        FIXED_REQUIREMENT_FIELD_NAMES[requirementType];
                    if (!fieldName) {
                        return null;
                    }

                    return (
                        <Grid
                            key={requirementType}
                            size={{ xs: 12, sm: 6, md: 4 }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name={fieldName}
                                        checked={Boolean(formData[fieldName])}
                                        onChange={handleChange}
                                    />
                                }
                                label={label}
                            />
                        </Grid>
                    );
                })}
                {customRequirements.map((requirement) => {
                    const key = requirementKey(
                        config.customType,
                        requirement.requirementName
                    );
                    const checked = formData[key]
                        ?? isNamedRequirementCompleted(
                            employee,
                            config.customType,
                            requirement.requirementName
                        );

                    return (
                        <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name={key}
                                        checked={Boolean(checked)}
                                        onChange={handleChange}
                                    />
                                }
                                label={requirement.requirementName}
                            />
                        </Grid>
                    );
                })}
            </Grid>
            {customRequirements.length === 0 && config.customType && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    No custom requirements are configured for this service.
                </Alert>
            )}
        </FormSection>
    );
}
