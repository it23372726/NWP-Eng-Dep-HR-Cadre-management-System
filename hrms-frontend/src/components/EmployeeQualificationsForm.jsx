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
    mapEmployeeToQualificationForm,
    requirementKey
} from "../utils/employeeQualificationForm";
import {
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS
} from "../constants/hrms";

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

const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
);

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

function renderFixedRequirementCheckboxes(fixedRequirements, formData, handleChange) {
    return fixedRequirements.map(({ requirementType, label }) => {
        const fieldName = FIXED_REQUIREMENT_FIELD_NAMES[requirementType];
        if (!fieldName) {
            return null;
        }

        return (
            <Grid key={requirementType} size={{ xs: 12, sm: 6, md: 4 }}>
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
    });
}

function renderCustomRequirementCheckboxes(
    requirementType,
    designationRequirements,
    formData,
    employee,
    handleChange
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
    });
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

    const renderSectionFields = () => {
        if (context.section === "permanent") {
            return (
                <Grid container spacing={1.5}>
                    {renderFixedRequirementCheckboxes(
                        FIXED_PERMANENT_REQUIREMENTS,
                        formData,
                        handleChange
                    )}
                    {renderCustomRequirementCheckboxes(
                        "CUSTOM_PERMANENT_REQUIREMENT",
                        designation?.permanentRequirements,
                        formData,
                        employee,
                        handleChange
                    )}
                </Grid>
            );
        }

        if (context.section === "grade2") {
            return (
                <>
                    {designation?.grade2RequiredYears != null && (
                        <Chip
                            size="small"
                            label={`Required service before Grade II: ${designation.grade2RequiredYears} year(s) from first appointment`}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                    )}
                    <Grid container spacing={1.5}>
                        {renderFixedRequirementCheckboxes(
                            FIXED_GRADE2_REQUIREMENTS,
                            formData,
                            handleChange
                        )}
                        {renderCustomRequirementCheckboxes(
                            "CUSTOM_GRADE_2_REQUIREMENT",
                            designation?.grade2Requirements,
                            formData,
                            employee,
                            handleChange
                        )}
                    </Grid>
                    {normalizeRequirements(designation?.grade2Requirements).length === 0 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            No custom Grade II requirements are configured for this
                            designation.
                        </Alert>
                    )}
                </>
            );
        }

        if (context.section === "grade1") {
            return (
                <>
                    {designation?.grade1RequiredYears != null && (
                        <Chip
                            size="small"
                            label={`Required service before Grade I: ${designation.grade1RequiredYears} year(s) in present Grade II class`}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                    )}
                    <Grid container spacing={1.5}>
                        {renderFixedRequirementCheckboxes(
                            FIXED_GRADE1_REQUIREMENTS,
                            formData,
                            handleChange
                        )}
                        {renderCustomRequirementCheckboxes(
                            "CUSTOM_GRADE_1_REQUIREMENT",
                            designation?.grade1Requirements,
                            formData,
                            employee,
                            handleChange
                        )}
                    </Grid>
                    {normalizeRequirements(designation?.grade1Requirements).length === 0 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            No custom Grade I requirements are configured for this
                            designation.
                        </Alert>
                    )}
                </>
            );
        }

        return null;
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

                        <FormSection
                            title={context.title}
                            description={context.description}
                        >
                            {renderSectionFields()}
                        </FormSection>
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
