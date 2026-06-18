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

function renderSectionContent(section, designation, formData, employee, handleChange) {
    return (
        <>
            {section.showGrade2Years
                && designation?.grade2RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade II: ${designation.grade2RequiredYears} year(s) from first appointment`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
            )}
            {section.showGrade1Years
                && designation?.grade1RequiredYears != null && (
                <Chip
                    size="small"
                    label={`Required service before Grade I: ${designation.grade1RequiredYears} year(s) in present Grade II class`}
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
                {renderCustomRequirementCheckboxes(
                    section.customType,
                    designation?.[section.customField],
                    formData,
                    employee,
                    handleChange,
                    section.id
                )}
            </Grid>
            {section.customType
                && normalizeRequirements(designation?.[section.customField]).length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    No custom requirements are configured for this designation
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
    const designation = employee?.designation;

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

            return name.startsWith(`${section.customType}:`);
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
        if (!employee || !context.canUpdate) {
            return;
        }

        handleSubmit(buildQualificationUpdatePayload(employee, formData));
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            scroll="paper"
        >
            <DialogTitle sx={{ pb: 1 }}>
                Update Qualifications
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
                                label={designation?.designationName || "Designation"}
                                variant="outlined"
                            />
                        </Stack>

                        <Stack spacing={3}>
                            {context.sections.map((section) => (
                                <FormSection
                                    key={section.id}
                                    title={section.title}
                                    description={section.description}
                                >
                                    {renderSectionContent(
                                        section,
                                        designation,
                                        formData,
                                        employee,
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
                    disabled={!context.canUpdate}
                >
                    Save Qualifications
                </Button>
            </DialogActions>
        </Dialog>
    );
}
