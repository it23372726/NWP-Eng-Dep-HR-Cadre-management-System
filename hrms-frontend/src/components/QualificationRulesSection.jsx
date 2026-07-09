import {
    Button,
    Grid,
    IconButton,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    RestartAlt as RestartAltIcon
} from "@mui/icons-material";

import FormSection from "./FormSection";
import {
    DEFAULT_GRADE1_REQUIREMENTS,
    DEFAULT_GRADE2_REQUIREMENTS,
    DEFAULT_PERMANENT_REQUIREMENTS,
    DEFAULT_SPECIAL_REQUIREMENTS,
    DEFAULT_SUPRA_REQUIREMENTS
} from "../constants/hrms";

function RequirementsEditor({
    field,
    label,
    items,
    defaults,
    onAdd,
    onUpdate,
    onRemove,
    onRestoreDefaults,
    fieldProps
}) {
    return (
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No requirements configured.
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
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => onAdd(field)}
                >
                    Add Requirement
                </Button>
                {defaults?.length > 0 && (
                    <Button
                        variant="text"
                        size="small"
                        startIcon={<RestartAltIcon />}
                        onClick={() => onRestoreDefaults(field, defaults)}
                    >
                        Restore defaults
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}

export default function QualificationRulesSection({
    formData,
    allowedGrades = [],
    fieldProps,
    onAddCustomRequirement,
    onUpdateCustomRequirement,
    onRemoveCustomRequirement,
    onRestoreDefaults
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
                description="Edit or remove defaults, or add service-specific requirements before an employee becomes permanent."
            >
                <RequirementsEditor
                    field="customPermanentRequirements"
                    label="Requirement"
                    items={formData.customPermanentRequirements}
                    defaults={DEFAULT_PERMANENT_REQUIREMENTS}
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    onRestoreDefaults={onRestoreDefaults}
                    fieldProps={fieldProps}
                />
            </FormSection>

            <FormSection
                title="Grade III → Grade II Promotion"
                description="Edit or remove defaults, or add service-specific requirements before promotion to Grade II."
            >
                <Grid container spacing={2} sx={{ mb: 2 }}>
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

                <RequirementsEditor
                    field="customGrade2Requirements"
                    label="Requirement"
                    items={formData.customGrade2Requirements}
                    defaults={DEFAULT_GRADE2_REQUIREMENTS}
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    onRestoreDefaults={onRestoreDefaults}
                    fieldProps={fieldProps}
                />
            </FormSection>

            <FormSection
                title="Grade II → Grade I Promotion"
                description="Edit or remove defaults, or add service-specific requirements before promotion to Grade I."
            >
                <Grid container spacing={2} sx={{ mb: 2 }}>
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

                <RequirementsEditor
                    field="customGrade1Requirements"
                    label="Requirement"
                    items={formData.customGrade1Requirements}
                    defaults={DEFAULT_GRADE1_REQUIREMENTS}
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    onRestoreDefaults={onRestoreDefaults}
                    fieldProps={fieldProps}
                />
            </FormSection>

            {showSupraRules && (
                <FormSection
                    title="Grade I → Supra Promotion"
                    description="Edit or remove defaults, or add service-specific requirements before promotion to Supra grade."
                >
                    <Grid container spacing={2} sx={{ mb: 2 }}>
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

                    <RequirementsEditor
                        field="customSupraRequirements"
                        label="Requirement"
                        items={formData.customSupraRequirements}
                        defaults={DEFAULT_SUPRA_REQUIREMENTS}
                        onAdd={onAddCustomRequirement}
                        onUpdate={onUpdateCustomRequirement}
                        onRemove={onRemoveCustomRequirement}
                        onRestoreDefaults={onRestoreDefaults}
                        fieldProps={fieldProps}
                    />
                </FormSection>
            )}

            {showSpecialRules && (
                <FormSection
                    title="Grade I → Special Promotion"
                    description="Edit or remove defaults, or add service-specific requirements before promotion to Special grade."
                >
                    <Grid container spacing={2} sx={{ mb: 2 }}>
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

                    <RequirementsEditor
                        field="customSpecialRequirements"
                        label="Requirement"
                        items={formData.customSpecialRequirements}
                        defaults={DEFAULT_SPECIAL_REQUIREMENTS}
                        onAdd={onAddCustomRequirement}
                        onUpdate={onUpdateCustomRequirement}
                        onRemove={onRemoveCustomRequirement}
                        onRestoreDefaults={onRestoreDefaults}
                        fieldProps={fieldProps}
                    />
                </FormSection>
            )}
        </>
    );
}
