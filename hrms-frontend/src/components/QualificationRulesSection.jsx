import {
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    Stack,
    TextField,
    Typography,
    alpha
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon
} from "@mui/icons-material";

import FormSection from "./FormSection";
import {
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    FIXED_SPECIAL_REQUIREMENTS,
    FIXED_SUPRA_REQUIREMENTS
} from "../constants/hrms";

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

const grade2FixedRequirements = [
    { requirementType: "ALL_PERMANENT", label: "All Permanent Requirements Completed" },
    ...FIXED_GRADE2_REQUIREMENTS
];

const grade1FixedRequirements = [
    { requirementType: "ALL_PERMANENT_G1", label: "All Permanent Requirements Completed" },
    { requirementType: "ALL_GRADE2", label: "All Grade II Requirements Completed" },
    ...FIXED_GRADE1_REQUIREMENTS
];

const supraFixedRequirements = [
    { requirementType: "ALL_PERMANENT_SUPRA", label: "All Permanent Requirements Completed" },
    { requirementType: "ALL_GRADE2_SUPRA", label: "All Grade II Requirements Completed" },
    { requirementType: "ALL_GRADE1_SUPRA", label: "All Grade I Requirements Completed" },
    ...FIXED_SUPRA_REQUIREMENTS
];

const specialFixedRequirements = [
    { requirementType: "ALL_PERMANENT_SPECIAL", label: "All Permanent Requirements Completed" },
    { requirementType: "ALL_GRADE2_SPECIAL", label: "All Grade II Requirements Completed" },
    { requirementType: "ALL_GRADE1_SPECIAL", label: "All Grade I Requirements Completed" },
    ...FIXED_SPECIAL_REQUIREMENTS
];

export default function QualificationRulesSection({
    formData,
    allowedGrades = [],
    fieldProps,
    onAddCustomRequirement,
    onUpdateCustomRequirement,
    onRemoveCustomRequirement
}) {
    const showSupraRules = allowedGrades.includes("Supra");
    const showSpecialRules = allowedGrades.includes("Special");

    return (
        <>
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
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
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
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
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
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    fieldProps={fieldProps}
                />
            </FormSection>

            {showSupraRules && (
                <FormSection
                    title="Grade I → Supra Promotion"
                    description="Requirements and service period before promotion to Supra grade."
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Standard Requirements
                    </Typography>
                    <FixedRequirementsList requirements={supraFixedRequirements} />

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                type="number"
                                label="Required Years Before Supra"
                                name="supraRequiredYears"
                                value={formData.supraRequiredYears}
                                slotProps={{ htmlInput: { min: 0 } }}
                                helperText="Years in present Grade I class"
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Custom Requirements
                    </Typography>
                    <CustomRequirementsEditor
                        field="customSupraRequirements"
                        label="Custom Supra Requirement"
                        items={formData.customSupraRequirements}
                        onAdd={onAddCustomRequirement}
                        onUpdate={onUpdateCustomRequirement}
                        onRemove={onRemoveCustomRequirement}
                        fieldProps={fieldProps}
                    />
                </FormSection>
            )}

            {showSpecialRules && (
                <FormSection
                    title="Grade I → Special Promotion"
                    description="Requirements and service period before promotion to Special grade."
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Standard Requirements
                    </Typography>
                    <FixedRequirementsList requirements={specialFixedRequirements} />

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                type="number"
                                label="Required Years Before Special"
                                name="specialRequiredYears"
                                value={formData.specialRequiredYears}
                                slotProps={{ htmlInput: { min: 0 } }}
                                helperText="Years in present Grade I class"
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Custom Requirements
                    </Typography>
                    <CustomRequirementsEditor
                        field="customSpecialRequirements"
                        label="Custom Special Requirement"
                        items={formData.customSpecialRequirements}
                        onAdd={onAddCustomRequirement}
                        onUpdate={onUpdateCustomRequirement}
                        onRemove={onRemoveCustomRequirement}
                        fieldProps={fieldProps}
                    />
                </FormSection>
            )}
        </>
    );
}
