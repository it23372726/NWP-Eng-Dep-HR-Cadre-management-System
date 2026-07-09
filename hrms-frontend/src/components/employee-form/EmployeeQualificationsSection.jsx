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
    const configuredRequirements = service?.[config.customField] || [];

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
                {configuredRequirements.map((requirement) => {
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
            {configuredRequirements.length === 0 && config.customType && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    No requirements are configured for this service.
                </Alert>
            )}
        </FormSection>
    );
}
