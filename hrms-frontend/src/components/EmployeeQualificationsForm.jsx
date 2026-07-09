import {
    Alert,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    Stack
} from "@mui/material";

import { useEffect, useState } from "react";

import {
    getEmployeeServiceRules,
    resolveEmployeeDesignationName
} from "../constants/hrms";
import FormSection from "./FormSection";
import { dialogActionsSx } from "../utils/formLayout";
import {
    buildQualificationUpdatePayload,
    getQualificationUpdateContext,
    isNamedRequirementCompleted,
    isRequirementLocked,
    mapEmployeeToQualificationForm,
    requirementKey
} from "../utils/employeeQualificationForm";

const FIXED_REQUIREMENT_FIELD_NAMES = {
    TRAINING_EXAM: "trainingExamPassed"
};

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

const isFieldLocked = (fieldName, employee, sectionId) => {
    const fixedType = Object.entries(FIXED_REQUIREMENT_FIELD_NAMES).find(
        ([, value]) => value === fieldName
    )?.[0];

    if (fixedType) {
        return isRequirementLocked(employee, fixedType, null, sectionId);
    }

    const separatorIndex = fieldName.indexOf(":");
    if (separatorIndex === -1) {
        return false;
    }

    const type = fieldName.slice(0, separatorIndex);
    const name = fieldName.slice(separatorIndex + 1);
    return isRequirementLocked(employee, type, name, sectionId);
};

function renderFixedRequirementCheckboxes(
    fixedRequirements,
    formData,
    handleChange,
    employee,
    sectionId
) {
    return fixedRequirements.map(({ requirementType, label }) => {
        const fieldName = FIXED_REQUIREMENT_FIELD_NAMES[requirementType];
        if (!fieldName) {
            return null;
        }

        const locked = isRequirementLocked(
            employee,
            requirementType,
            null,
            sectionId
        );

        return (
            <Grid key={requirementType} size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={fieldName}
                            checked={Boolean(formData[fieldName])}
                            onChange={handleChange}
                            disabled={locked}
                        />
                    }
                    label={locked ? `${label} (Completed)` : label}
                />
            </Grid>
        );
    });
}

function renderCustomRequirementCheckboxes(
    requirementType,
    designationRequirements,
    formData,
    employee,
    handleChange,
    sectionId
) {
    return normalizeRequirements(designationRequirements).map((requirement) => {
        const key = requirementKey(
            requirementType,
            requirement.requirementName
        );
        const checked = formData[key] ?? isNamedRequirementCompleted(
            employee,
            requirementType,
            requirement.requirementName
        );
        const locked = isRequirementLocked(
            employee,
            requirementType,
            requirement.requirementName,
            sectionId
        );

        return (
            <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={key}
                            checked={Boolean(checked)}
                            onChange={handleChange}
                            disabled={locked}
                        />
                    }
                    label={
                        locked
                            ? `${requirement.requirementName} (Completed)`
                            : requirement.requirementName
                    }
                />
            </Grid>
        );
    });
}

function renderSectionContent(section, employee, formData, handleChange) {
    const service = getEmployeeServiceRules(employee);
    const configuredRequirements = section.customField
        ? normalizeRequirements(service?.[section.customField])
        : [];

    return (
        <>
            {section.showGrade2Years
                && service?.grade2RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade II: ${service.grade2RequiredYears} year(s) from first appointment`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            {section.showGrade1Years
                && service?.grade1RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade I: ${service.grade1RequiredYears} year(s) in present Grade II class`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            {section.showSupraYears
                && service?.supraRequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Supra: ${service.supraRequiredYears} year(s) in present Grade I class`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            {section.showSpecialYears
                && service?.specialRequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Special: ${service.specialRequiredYears} year(s) in present Grade I class`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            <Grid container spacing={1.5}>
                {renderFixedRequirementCheckboxes(
                    section.fixedRequirements,
                    formData,
                    handleChange,
                    employee,
                    section.id
                )}
                {section.customType && renderCustomRequirementCheckboxes(
                    section.customType,
                    configuredRequirements,
                    formData,
                    employee,
                    handleChange,
                    section.id
                )}
            </Grid>
            {section.customType
                && configuredRequirements.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    No requirements are configured for this service
                    in this section.
                </Alert>
            )}
        </>
    );
}

export default function EmployeeQualificationsForm({
    open,
    handleClose,
    handleSubmit,
    employee
}) {
    const [formData, setFormData] = useState({});
    const context = getQualificationUpdateContext(employee);
    const service = getEmployeeServiceRules(employee);

    useEffect(() => {
        if (open && employee) {
            setFormData(mapEmployeeToQualificationForm(employee));
        }
    }, [employee, open]);

    const handleChange = (event) => {
        const { name, checked } = event.target;

        const sectionId = context.sections.find((section) => {
            const fixedType = Object.entries(FIXED_REQUIREMENT_FIELD_NAMES).find(
                ([, value]) => value === name
            )?.[0];

            if (fixedType) {
                return section.fixedRequirements.some(
                    (requirement) => requirement.requirementType === fixedType
                );
            }

            return section.customType
                && name.startsWith(`${section.customType}:`);
        })?.id;

        if (!checked && isFieldLocked(name, employee, sectionId)) {
            return;
        }

        setFormData((current) => ({
            ...current,
            [name]: checked
        }));
    };

    const submitForm = () => {
        if (!employee || !context.canSave) {
            return;
        }

        handleSubmit(buildQualificationUpdatePayload(employee, formData));
    };

    const isReadOnly = context.canUpdate && !context.canSave;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {isReadOnly ? "View Qualifications" : "Update Qualifications"}
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    bgcolor: "grey.50",
                    px: { xs: 2, sm: 3 },
                    py: 2
                }}
            >
                {!context.canUpdate ? (
                    <Alert severity="info">
                        {context.message}
                    </Alert>
                ) : (
                    <>
                        {isReadOnly && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {context.message}
                            </Alert>
                        )}
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            sx={{ mb: 2, gap: 1 }}
                        >
                            <Chip
                                size="small"
                                label={`Grade ${employee.grade}`}
                                variant="outlined"
                            />
                            <Chip
                                size="small"
                                label={resolveEmployeeDesignationName(employee) || "Designation"}
                                variant="outlined"
                            />
                            {service?.serviceCode && (
                                <Chip
                                    size="small"
                                    label={service.serviceCode}
                                    variant="outlined"
                                />
                            )}
                        </Stack>

                        <Stack spacing={3}>
                            {context.sections.map((section) => (
                                <FormSection
                                    key={section.id}
                                    title={section.title}
                                    description={section.description}
                                >
                                    {context.editableSectionId
                                        && section.id !== context.editableSectionId && (
                                        <Alert severity="info" sx={{ mb: 1.5 }}>
                                            These requirements are locked for employees
                                            who have already passed this career stage.
                                        </Alert>
                                    )}
                                    {renderSectionContent(
                                        section,
                                        employee,
                                        formData,
                                        handleChange
                                    )}
                                </FormSection>
                            ))}
                        </Stack>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={submitForm}
                    disabled={!context.canSave}
                >
                    Save Qualifications
                </Button>
            </DialogActions>
        </Dialog>
    );
}
