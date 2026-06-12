import { Alert, Chip, Grid, MenuItem, Stack, TextField } from "@mui/material";

import { EMPLOYMENT_TYPES } from "../../constants/hrms";
import FormSection from "../FormSection";

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
                    ? "Permanent employees enter full career history. Other types use a compact form."
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
