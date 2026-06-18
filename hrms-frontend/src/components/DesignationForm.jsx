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
    FormHelperText,
    Alert,
    Stack,
    Chip,
    Box,
    IconButton,
    Divider,
    alpha
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon
} from "@mui/icons-material";
import { useEffect, useState } from "react";

import { getServices } from "../services/serviceService";
import { getServiceLevels } from "../services/serviceLevelService";
import FormSection from "./FormSection";
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

function FixedRequirementsList({ requirements }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)"
                },
                gap: 1,
                mt: 1
            }}
        >
            {requirements.map((requirement) => (
                <Stack
                    key={requirement.requirementType}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.success.main, 0.2)
                    }}
                >
                    <CheckCircleIcon
                        fontSize="small"
                        color="success"
                        sx={{ mt: 0.25, flexShrink: 0 }}
                    />
                    <Typography variant="body2">{requirement.label}</Typography>
                </Stack>
            ))}
        </Box>
    );
}

function GradeSelector({ selectedGrades, onToggle, error }) {
    return (
        <Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {GRADES.map((grade) => {
                    const selected = selectedGrades.includes(grade);
                    return (
                        <Chip
                            key={grade}
                            label={grade}
                            clickable
                            onClick={() => onToggle(grade)}
                            color={selected ? "primary" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            sx={{ fontWeight: selected ? 600 : 400 }}
                        />
                    );
                })}
            </Stack>
            {error && (
                <FormHelperText error sx={{ mt: 1, mx: 0 }}>
                    {error}
                </FormHelperText>
            )}
        </Box>
    );
}

function CustomRequirementsEditor({
    field,
    label,
    items,
    onAdd,
    onUpdate,
    onRemove,
    fieldProps
}) {
    return (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No custom requirements added.
                </Typography>
            )}
            {items.map((requirement, index) => (
                <Stack
                    key={`${field}-${index}`}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                >
                    <TextField
                        {...fieldProps}
                        label={`${label} ${index + 1}`}
                        value={requirement}
                        onChange={(event) => onUpdate(field, index, event.target.value)}
                        placeholder="Enter requirement description"
                        sx={{ flex: 1 }}
                    />
                    <IconButton
                        color="error"
                        onClick={() => onRemove(field, index)}
                        aria-label="Remove requirement"
                        sx={{ mt: 0.5 }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Stack>
            ))}
            <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAdd(field)}
                sx={{ alignSelf: "flex-start" }}
            >
                Add Requirement
            </Button>
        </Stack>
    );
}

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

    const canSave =
        formData.designationName.trim()
        && formData.serviceId
        && formData.serviceLevelId
        && formData.allowedGrades.length > 0;

    const grade2FixedRequirements = [
        { requirementType: "ALL_PERMANENT", label: "All Permanent Requirements Completed" },
        ...FIXED_GRADE2_REQUIREMENTS
    ];

    const grade1FixedRequirements = [
        { requirementType: "ALL_PERMANENT_G1", label: "All Permanent Requirements Completed" },
        { requirementType: "ALL_GRADE2", label: "All Grade II Requirements Completed" },
        ...FIXED_GRADE1_REQUIREMENTS
    ];

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
                    {isEdit ? "Edit Designation" : "Add Designation"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Configure designation details, grade eligibility, and promotion rules.
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
                    title="Basic Information"
                    description="Core designation identity and service classification."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Designation Name"
                                name="designationName"
                                value={formData.designationName}
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Salary Code"
                                name="salaryCode"
                                value={formData.salaryCode}
                                placeholder="Optional"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Service"
                                name="serviceId"
                                value={formData.serviceId}
                                required
                            >
                                {services.map((service) => (
                                    <MenuItem key={service.id} value={service.id}>
                                        {service.serviceCode} — {service.description}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Service Level"
                                name="serviceLevelId"
                                value={formData.serviceLevelId}
                                required
                            >
                                {serviceLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.levelName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    {formData.serviceId && formData.serviceLevelId && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Employees assigned to this designation must match the selected
                            service level and one of the allowed grades.
                        </Alert>
                    )}
                </FormSection>

                <FormSection
                    title="Allowed Grades"
                    description="Select which grade classes employees may hold under this designation."
                >
                    <GradeSelector
                        selectedGrades={formData.allowedGrades}
                        onToggle={toggleGrade}
                        error={gradeError}
                    />
                </FormSection>

                <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ mb: 2, px: 0.5 }}
                >
                    Qualification & Promotion Rules
                </Typography>

                <FormSection
                    title="Permanent Requirements"
                    description="Standard and custom requirements before an employee becomes permanent."
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Standard Requirements
                    </Typography>
                    <FixedRequirementsList requirements={FIXED_PERMANENT_REQUIREMENTS} />

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Custom Requirements
                    </Typography>
                    <CustomRequirementsEditor
                        field="customPermanentRequirements"
                        label="Custom Permanent Requirement"
                        items={formData.customPermanentRequirements}
                        onAdd={addCustomRequirement}
                        onUpdate={updateCustomRequirement}
                        onRemove={removeCustomRequirement}
                        fieldProps={fieldProps}
                    />
                </FormSection>

                <FormSection
                    title="Grade III → Grade II Promotion"
                    description="Requirements and service period before promotion to Grade II."
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Standard Requirements
                    </Typography>
                    <FixedRequirementsList requirements={grade2FixedRequirements} />

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                type="number"
                                label="Required Years Before Grade II"
                                name="grade2RequiredYears"
                                value={formData.grade2RequiredYears}
                                slotProps={{ htmlInput: { min: 0 } }}
                                helperText="Years of service from first appointment"
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Custom Requirements
                    </Typography>
                    <CustomRequirementsEditor
                        field="customGrade2Requirements"
                        label="Custom Grade II Requirement"
                        items={formData.customGrade2Requirements}
                        onAdd={addCustomRequirement}
                        onUpdate={updateCustomRequirement}
                        onRemove={removeCustomRequirement}
                        fieldProps={fieldProps}
                    />
                </FormSection>

                <FormSection
                    title="Grade II → Grade I Promotion"
                    description="Requirements and service period before promotion to Grade I."
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Standard Requirements
                    </Typography>
                    <FixedRequirementsList requirements={grade1FixedRequirements} />

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                type="number"
                                label="Required Years Before Grade I"
                                name="grade1RequiredYears"
                                value={formData.grade1RequiredYears}
                                slotProps={{ htmlInput: { min: 0 } }}
                                helperText="Years in present Grade II class"
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Custom Requirements
                    </Typography>
                    <CustomRequirementsEditor
                        field="customGrade1Requirements"
                        label="Custom Grade I Requirement"
                        items={formData.customGrade1Requirements}
                        onAdd={addCustomRequirement}
                        onUpdate={updateCustomRequirement}
                        onRemove={removeCustomRequirement}
                        fieldProps={fieldProps}
                    />
                </FormSection>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={submitForm} disabled={!canSave}>
                    {isEdit ? "Save Changes" : "Create Designation"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
