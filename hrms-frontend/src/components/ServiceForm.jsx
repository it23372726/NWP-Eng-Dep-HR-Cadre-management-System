import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    Grid,
    Typography,
    Alert
} from "@mui/material";
import { useEffect, useState } from "react";

import FormSection from "./FormSection";
import GradeSelector from "./GradeSelector";
import QualificationRulesSection from "./QualificationRulesSection";
import {
    DEFAULT_GRADE1_REQUIREMENTS,
    DEFAULT_GRADE2_REQUIREMENTS,
    DEFAULT_PERMANENT_REQUIREMENTS,
    DEFAULT_SPECIAL_REQUIREMENTS,
    DEFAULT_SUPRA_REQUIREMENTS
} from "../constants/hrms";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";

const emptyForm = {
    serviceCode: "",
    description: "",
    allowedGrades: [],
    grade2RequiredYears: "",
    grade1RequiredYears: "",
    supraRequiredYears: "",
    specialRequiredYears: "",
    customPermanentRequirements: [...DEFAULT_PERMANENT_REQUIREMENTS],
    customGrade2Requirements: [...DEFAULT_GRADE2_REQUIREMENTS],
    customGrade1Requirements: [...DEFAULT_GRADE1_REQUIREMENTS],
    customSupraRequirements: [...DEFAULT_SUPRA_REQUIREMENTS],
    customSpecialRequirements: [...DEFAULT_SPECIAL_REQUIREMENTS]
};

export default function ServiceForm({
    open,
    handleClose,
    handleSubmit,
    selectedService
}) {
    const [formData, setFormData] = useState(emptyForm);
    const [codeError, setCodeError] = useState("");
    const [gradeError, setGradeError] = useState("");

    const isEdit = Boolean(selectedService);

    useEffect(() => {
        if (selectedService) {
            setFormData({
                serviceCode: selectedService.serviceCode ?? "",
                description: selectedService.description ?? "",
                allowedGrades: selectedService.allowedGrades ?? [],
                grade2RequiredYears: selectedService.grade2RequiredYears ?? "",
                grade1RequiredYears: selectedService.grade1RequiredYears ?? "",
                supraRequiredYears: selectedService.supraRequiredYears ?? "",
                specialRequiredYears: selectedService.specialRequiredYears ?? "",
                customPermanentRequirements:
                    selectedService.permanentRequirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customGrade2Requirements:
                    selectedService.grade2Requirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customGrade1Requirements:
                    selectedService.grade1Requirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customSupraRequirements:
                    selectedService.supraRequirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customSpecialRequirements:
                    selectedService.specialRequirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? []
            });
        } else {
            setFormData(emptyForm);
        }
        setCodeError("");
        setGradeError("");
    }, [selectedService, open]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (e.target.name === "serviceCode") {
            setCodeError("");
        }
    };

    const toggleGrade = (grade) => {
        const exists = formData.allowedGrades.includes(grade);
        let allowedGrades = exists
            ? formData.allowedGrades.filter((g) => g !== grade)
            : [...formData.allowedGrades, grade];

        let nextForm = { ...formData, allowedGrades };

        if (!exists && grade === "Supra") {
            allowedGrades = allowedGrades.filter((g) => g !== "Special");
            nextForm = {
                ...nextForm,
                allowedGrades,
                specialRequiredYears: "",
                customSpecialRequirements: [],
                customSupraRequirements:
                    formData.customSupraRequirements.length > 0
                        ? formData.customSupraRequirements
                        : [...DEFAULT_SUPRA_REQUIREMENTS]
            };
        } else if (!exists && grade === "Special") {
            allowedGrades = allowedGrades.filter((g) => g !== "Supra");
            nextForm = {
                ...nextForm,
                allowedGrades,
                supraRequiredYears: "",
                customSupraRequirements: [],
                customSpecialRequirements:
                    formData.customSpecialRequirements.length > 0
                        ? formData.customSpecialRequirements
                        : [...DEFAULT_SPECIAL_REQUIREMENTS]
            };
        } else if (exists && grade === "Supra") {
            nextForm = {
                ...nextForm,
                allowedGrades,
                supraRequiredYears: "",
                customSupraRequirements: []
            };
        } else if (exists && grade === "Special") {
            nextForm = {
                ...nextForm,
                allowedGrades,
                specialRequiredYears: "",
                customSpecialRequirements: []
            };
        } else {
            nextForm.allowedGrades = allowedGrades;
        }

        setFormData(nextForm);
        setGradeError("");
    };

    const addCustomRequirement = (field) => {
        setFormData({
            ...formData,
            [field]: [...formData[field], ""]
        });
    };

    const updateCustomRequirement = (field, index, value) => {
        setFormData({
            ...formData,
            [field]: formData[field].map((item, itemIndex) =>
                itemIndex === index ? value : item
            )
        });
    };

    const removeCustomRequirement = (field, index) => {
        setFormData({
            ...formData,
            [field]: formData[field].filter((_, itemIndex) => itemIndex !== index)
        });
    };

    const restoreDefaultRequirements = (field, defaults) => {
        setFormData({
            ...formData,
            [field]: [...defaults]
        });
    };

    const cleanRequirements = (requirements) =>
        requirements.map((requirement) => requirement.trim()).filter(Boolean);

    const { fieldProps } = createFormFieldProps(handleChange);

    const submitForm = () => {
        const trimmedCode = formData.serviceCode.trim();
        const trimmedDescription = formData.description.trim();

        if (!trimmedCode) {
            setCodeError("Service code is required");
            return;
        }

        if (!formData.allowedGrades.length) {
            setGradeError("Select at least one maximum achievable grade");
            return;
        }

        handleSubmit({
            serviceCode: trimmedCode,
            description: trimmedDescription,
            allowedGrades: formData.allowedGrades,
            grade2RequiredYears:
                formData.grade2RequiredYears === ""
                    ? 0
                    : Number(formData.grade2RequiredYears),
            grade1RequiredYears:
                formData.grade1RequiredYears === ""
                    ? 0
                    : Number(formData.grade1RequiredYears),
            supraRequiredYears:
                formData.supraRequiredYears === ""
                    ? 0
                    : Number(formData.supraRequiredYears),
            specialRequiredYears:
                formData.specialRequiredYears === ""
                    ? 0
                    : Number(formData.specialRequiredYears),
            customPermanentRequirements: cleanRequirements(
                formData.customPermanentRequirements
            ),
            customGrade2Requirements: cleanRequirements(
                formData.customGrade2Requirements
            ),
            customGrade1Requirements: cleanRequirements(
                formData.customGrade1Requirements
            ),
            customSupraRequirements: formData.allowedGrades.includes("Supra")
                ? cleanRequirements(formData.customSupraRequirements)
                : [],
            customSpecialRequirements: formData.allowedGrades.includes("Special")
                ? cleanRequirements(formData.customSpecialRequirements)
                : []
        });
    };

    const canSave =
        formData.serviceCode.trim()
        && formData.description.trim()
        && formData.allowedGrades.length > 0;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="lg"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" component="span">
                    {isEdit ? "Edit Service" : "Add Service"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Configure service identity, maximum achievable grades, and
                    qualification rules shared by all designations in this service.
                </Typography>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    bgcolor: "grey.50",
                    px: { xs: 2, sm: 3 },
                    py: 2
                }}
            >
                <FormSection
                    title="Service Details"
                    description="Enter the service code and a clear description."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Service Code"
                                name="serviceCode"
                                value={formData.serviceCode}
                                placeholder="e.g. SLEgS"
                                required
                                error={Boolean(codeError)}
                                helperText={codeError || "Short unique identifier"}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Description"
                                name="description"
                                value={formData.description}
                                multiline
                                minRows={2}
                                required
                                placeholder="Full service name or description"
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Qualification and promotion rules configured here apply
                                to every designation in this service nationwide.
                            </Alert>
                        </Grid>
                    </Grid>
                </FormSection>

                <FormSection
                    title="Maximum Achievable Grades"
                    description="Select the highest grade classes employees may reach in this service."
                >
                    <GradeSelector
                        selectedGrades={formData.allowedGrades}
                        onToggle={toggleGrade}
                        error={gradeError}
                    />
                </FormSection>

                <QualificationRulesSection
                    formData={formData}
                    allowedGrades={formData.allowedGrades}
                    fieldProps={fieldProps}
                    onAddCustomRequirement={addCustomRequirement}
                    onUpdateCustomRequirement={updateCustomRequirement}
                    onRemoveCustomRequirement={removeCustomRequirement}
                    onRestoreDefaults={restoreDefaultRequirements}
                />
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submitForm}
                    disabled={!canSave}
                >
                    {isEdit ? "Save Changes" : "Create Service"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
