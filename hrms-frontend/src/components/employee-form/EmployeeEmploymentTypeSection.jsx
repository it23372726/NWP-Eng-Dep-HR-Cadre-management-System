import {
    Alert,
    Box,
    Chip,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from "@mui/material";

import { EMPLOYMENT_TYPES, TRAINING_PERIOD_OPTIONS } from "../../constants/hrms";
import FormSection from "../FormSection";

function TrainingPeriodField({ value, onChange }) {
    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                minHeight: { xs: 88, sm: 40 },
                display: "flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                transition: "border-color 0.2s",
                "&:hover": {
                    borderColor: "text.primary"
                }
            }}
        >
            <InputLabel
                shrink
                required
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 10,
                    transform: "translateY(-50%)",
                    px: 0.5,
                    bgcolor: "background.paper",
                    fontSize: "0.75rem",
                    lineHeight: 1.2
                }}
            >
                Training period
            </InputLabel>
            <RadioGroup
                name="trainingPeriodYears"
                value={value}
                onChange={onChange}
                sx={{
                    width: "100%",
                    ml: 0.25,
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 0, sm: 2 }
                }}
            >
                {TRAINING_PERIOD_OPTIONS.map((option) => (
                    <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size="small" />}
                        label={(
                            <Typography variant="body2" component="span">
                                {option.label}
                            </Typography>
                        )}
                        sx={{ mr: 0, my: 0 }}
                    />
                ))}
            </RadioGroup>
        </Box>
    );
}

export default function EmployeeEmploymentTypeSection({
    formData,
    selectFieldProps,
    isCreate = true,
    readOnly = false
}) {
    return (
        <FormSection
            title="Employment type"
            description={
                isCreate
                    ? "Permanent employees enter full career history. Contract, training, and other types use a compact form."
                    : "Employment type cannot be changed after creation."
            }
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Employment Type"
                        name="employmentType"
                        value={formData.employmentType}
                        disabled={readOnly}
                    >
                        {EMPLOYMENT_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>
        </FormSection>
    );
}

export function EmployeeContractPositionSection({
    formData,
    designations,
    selectFieldProps,
    designationDisabled = false
}) {
    return (
        <FormSection
            title="Position"
            description="Designation for this contract employee."
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Designation"
                        name="designationId"
                        value={formData.designationId}
                        disabled={designationDisabled}
                    >
                        {designations.map((designation) => (
                            <MenuItem
                                key={designation.id}
                                value={designation.id}
                            >
                                {designation.designationName}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>
        </FormSection>
    );
}

export function EmployeeTrainingPositionSection({
    formData,
    designations,
    selectFieldProps,
    onTrainingPeriodChange,
    designationDisabled = false
}) {
    return (
        <FormSection
            title="Position"
            description="Designation and training period for this trainee."
        >
            <Grid container spacing={2} alignItems="stretch">
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Designation"
                        name="designationId"
                        value={formData.designationId}
                        disabled={designationDisabled}
                    >
                        {designations.map((designation) => (
                            <MenuItem
                                key={designation.id}
                                value={designation.id}
                            >
                                {designation.designationName}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid
                    size={{ xs: 12, md: 6 }}
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        pt: { xs: 0, md: 0 }
                    }}
                >
                    <TrainingPeriodField
                        value={String(formData.trainingPeriodYears || "1")}
                        onChange={onTrainingPeriodChange}
                    />
                </Grid>
            </Grid>
        </FormSection>
    );
}

export function EmployeeNonPermanentPositionSection({
    formData,
    designations,
    serviceLevels,
    selectFieldProps,
    selectedDesignation,
    assignmentError,
    designationDisabled = false
}) {
    return (
        <FormSection
            title="Position"
            description="Designation and service level for this employee."
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Designation"
                        name="designationId"
                        value={formData.designationId}
                        disabled={designationDisabled}
                        helperText={
                            designationDisabled
                                ? "Change designation through career history or promotion"
                                : undefined
                        }
                    >
                        {designations.map((designation) => (
                            <MenuItem
                                key={designation.id}
                                value={designation.id}
                            >
                                {designation.designationName}
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
                    >
                        {serviceLevels.map((level) => (
                            <MenuItem key={level.id} value={level.id}>
                                {level.levelName}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>

            {selectedDesignation && (
                <Stack
                    direction="row"
                    gap={1}
                    sx={{ mt: 2, flexWrap: "wrap" }}
                >
                    {selectedDesignation.service && (
                        <Chip
                            size="small"
                            label={`Service: ${selectedDesignation.service.serviceCode}`}
                            variant="outlined"
                        />
                    )}
                    {selectedDesignation.serviceLevel && (
                        <Chip
                            size="small"
                            label={`Required level: ${selectedDesignation.serviceLevel.levelName}`}
                            variant="outlined"
                        />
                    )}
                </Stack>
            )}

            {assignmentError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {assignmentError}
                </Alert>
            )}
        </FormSection>
    );
}
