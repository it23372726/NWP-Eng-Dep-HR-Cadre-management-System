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
    Delete as DeleteIcon
} from "@mui/icons-material";

import FormSection from "./FormSection";

function RequirementsEditor({
    field,
    label,
    items,
    onAdd,
    onUpdate,
    onRemove,
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
                description="Add service-specific requirements before an employee becomes permanent."
            >
                <RequirementsEditor
                    field="customPermanentRequirements"
                    label="Requirement"
                    items={formData.customPermanentRequirements}
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    fieldProps={fieldProps}
                />
            </FormSection>

            <FormSection
                title="Grade III → Grade II Promotion"
                description="Add service-specific requirements before promotion to Grade II."
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
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    fieldProps={fieldProps}
                />
            </FormSection>

            <FormSection
                title="Grade II → Grade I Promotion"
                description="Add service-specific requirements before promotion to Grade I."
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
                    onAdd={onAddCustomRequirement}
                    onUpdate={onUpdateCustomRequirement}
                    onRemove={onRemoveCustomRequirement}
                    fieldProps={fieldProps}
                />
            </FormSection>

            {showSupraRules && (
                <FormSection
                    title="Grade I → Supra Promotion"
                    description="Add service-specific requirements before promotion to Supra grade."
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
                    description="Add service-specific requirements before promotion to Special grade."
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
