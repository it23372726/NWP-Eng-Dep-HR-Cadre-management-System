import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    MenuItem,
    Grid,
    Typography,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormHelperText,
    Alert,
    Stack,
    Chip
} from "@mui/material";

import { useEffect, useState } from "react";

import { getServices } from "../services/serviceService";
import { getServiceLevels } from "../services/serviceLevelService";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";
import {
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    GRADES
} from "../constants/hrms";

const emptyForm = {
    designationName: "",
    serviceId: "",
    serviceLevelId: "",
    allowedGrades: [],
    salaryCode: "",
    grade2RequiredYears: "",
    grade1RequiredYears: "",
    customPermanentRequirements: [],
    customGrade2Requirements: [],
    customGrade1Requirements: []
};

export default function DesignationForm({
    open,
    handleClose,
    handleSubmit,
    selectedDesignation
}) {
    const [services, setServices] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [gradeError, setGradeError] = useState("");

    const isEdit = Boolean(selectedDesignation);

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        if (selectedDesignation) {
            setFormData({
                designationName: selectedDesignation.designationName ?? "",
                serviceId: selectedDesignation.service?.id ?? "",
                serviceLevelId: selectedDesignation.serviceLevel?.id ?? "",
                allowedGrades: selectedDesignation.allowedGrades ?? [],
                salaryCode: selectedDesignation.salaryCode ?? "",
                grade2RequiredYears: selectedDesignation.grade2RequiredYears ?? "",
                grade1RequiredYears: selectedDesignation.grade1RequiredYears ?? "",
                customPermanentRequirements:
                    selectedDesignation.permanentRequirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customGrade2Requirements:
                    selectedDesignation.grade2Requirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? [],
                customGrade1Requirements:
                    selectedDesignation.grade1Requirements?.map(
                        (requirement) => requirement.requirementName
                    ) ?? []
            });
        } else {
            setFormData(emptyForm);
        }
        setGradeError("");
    }, [selectedDesignation, open]);

    const loadDropdowns = async () => {
        const [serviceData, levelData] = await Promise.all([
            getServices(),
            getServiceLevels()
        ]);
        setServices(serviceData);
        setServiceLevels(levelData);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const toggleGrade = (grade) => {
        const exists = formData.allowedGrades.includes(grade);
        const allowedGrades = exists
            ? formData.allowedGrades.filter((g) => g !== grade)
            : [...formData.allowedGrades, grade];

        setFormData({ ...formData, allowedGrades });
        setGradeError("");
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

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

    const cleanRequirements = (requirements) =>
        requirements.map((requirement) => requirement.trim()).filter(Boolean);

    const renderFixedRequirements = (requirements) => (
        <Stack direction="row" gap={1} sx={{ flexWrap: "wrap", mt: 1 }}>
            {requirements.map((requirement) => (
                <Chip
                    key={requirement.requirementType}
                    size="small"
                    color="success"
                    variant="outlined"
                    label={`✓ ${requirement.label}`}
                />
            ))}
        </Stack>
    );

    const renderCustomRequirements = (field, label) => (
        <Stack spacing={1} sx={{ mt: 1 }}>
            {formData[field].map((requirement, index) => (
                <Stack
                    key={`${field}-${index}`}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                >
                    <TextField
                        {...fieldProps}
                        label={label}
                        value={requirement}
                        onChange={(event) =>
                            updateCustomRequirement(
                                field,
                                index,
                                event.target.value
                            )
                        }
                    />
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => removeCustomRequirement(field, index)}
                    >
                        Delete
                    </Button>
                </Stack>
            ))}
            <Button
                variant="outlined"
                onClick={() => addCustomRequirement(field)}
                sx={{ alignSelf: "flex-start" }}
            >
                Add Requirement
            </Button>
        </Stack>
    );

    const submitForm = () => {
        if (!formData.allowedGrades.length) {
            setGradeError("Select at least one allowed grade");
            return;
        }

        handleSubmit({
            designationName: formData.designationName.trim(),
            serviceId: Number(formData.serviceId),
            serviceLevelId: Number(formData.serviceLevelId),
            allowedGrades: formData.allowedGrades,
            salaryCode: formData.salaryCode?.trim() || null,
            grade2RequiredYears:
                formData.grade2RequiredYears === ""
                    ? null
                    : Number(formData.grade2RequiredYears),
            grade1RequiredYears:
                formData.grade1RequiredYears === ""
                    ? null
                    : Number(formData.grade1RequiredYears),
            customPermanentRequirements: cleanRequirements(
                formData.customPermanentRequirements
            ),
            customGrade2Requirements: cleanRequirements(
                formData.customGrade2Requirements
            ),
            customGrade1Requirements: cleanRequirements(
                formData.customGrade1Requirements
            )
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle>
                {isEdit ? "Edit Designation" : "Add Designation"}
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                >
                    Designation details
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Designation Name"
                            name="designationName"
                            value={formData.designationName}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Salary Code"
                            name="salaryCode"
                            value={formData.salaryCode}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service"
                            name="serviceId"
                            value={formData.serviceId}
                        >
                            {services.map((service) => (
                                <MenuItem
                                    key={service.id}
                                    value={service.id}
                                >
                                    {service.serviceCode} — {service.description}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service Level"
                            name="serviceLevelId"
                            value={formData.serviceLevelId}
                        >
                            {serviceLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.levelName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mt: 2.5, mb: 1 }}
                >
                    Allowed grades / classes
                </Typography>

                <FormGroup row>
                    {GRADES.map((grade) => (
                        <FormControlLabel
                            key={grade}
                            control={
                                <Checkbox
                                    checked={formData.allowedGrades.includes(grade)}
                                    onChange={() => toggleGrade(grade)}
                                />
                            }
                            label={grade}
                        />
                    ))}
                </FormGroup>

                {gradeError && (
                    <FormHelperText error sx={{ mt: 1 }}>
                        {gradeError}
                    </FormHelperText>
                )}

                <Typography
                    variant="subtitle1"
                    sx={{ mt: 3, mb: 1, fontWeight: 700 }}
                >
                    Qualification & Promotion Rules
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    Permanent Requirements
                </Typography>
                {renderFixedRequirements(FIXED_PERMANENT_REQUIREMENTS)}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Custom Permanent Requirements
                </Typography>
                {renderCustomRequirements(
                    "customPermanentRequirements",
                    "Custom Permanent Requirement"
                )}

                <Typography variant="subtitle2" sx={{ mt: 3 }}>
                    Grade III → Grade II Promotion Requirements
                </Typography>
                {renderFixedRequirements([
                    { requirementType: "ALL_PERMANENT", label: "All Permanent Requirements Completed" },
                    ...FIXED_GRADE2_REQUIREMENTS
                ])}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            type="number"
                            label="Required Years Before Grade II Promotion"
                            name="grade2RequiredYears"
                            value={formData.grade2RequiredYears}
                            slotProps={{ htmlInput: { min: 0 } }}
                        />
                    </Grid>
                </Grid>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Custom Grade II Requirements
                </Typography>
                {renderCustomRequirements(
                    "customGrade2Requirements",
                    "Custom Grade II Requirement"
                )}

                <Typography variant="subtitle2" sx={{ mt: 3 }}>
                    Grade II → Grade I Promotion Requirements
                </Typography>
                {renderFixedRequirements([
                    { requirementType: "ALL_PERMANENT_G1", label: "All Permanent Requirements Completed" },
                    { requirementType: "ALL_GRADE2", label: "All Grade II Requirements Completed" },
                    ...FIXED_GRADE1_REQUIREMENTS
                ])}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            type="number"
                            label="Required Years Before Grade I Promotion"
                            name="grade1RequiredYears"
                            value={formData.grade1RequiredYears}
                            slotProps={{ htmlInput: { min: 0 } }}
                        />
                    </Grid>
                </Grid>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Custom Grade I Requirements
                </Typography>
                {renderCustomRequirements(
                    "customGrade1Requirements",
                    "Custom Grade I Requirement"
                )}

                {formData.serviceId && formData.serviceLevelId && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Employees assigned to this designation must match the
                        selected service level and one of the allowed grades.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={submitForm}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
