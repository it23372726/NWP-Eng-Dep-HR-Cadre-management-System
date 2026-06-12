import { Grid, MenuItem, TextField } from "@mui/material";

import FormSection from "../FormSection";

export default function EmployeePersonalSection({
    formData,
    fieldProps,
    dateFieldProps,
    selectFieldProps
}) {
    return (
        <FormSection
            title="Personal details"
            description="Official identification and personal information."
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...fieldProps}
                        label="S/N"
                        name="employeeNo"
                        value={formData.employeeNo}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...fieldProps}
                        label="NIC No"
                        name="nic"
                        value={formData.nic}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...fieldProps}
                        label="Contact No"
                        name="contactNo"
                        value={formData.contactNo}
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...fieldProps}
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...dateFieldProps}
                        label="Date of Birth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Gender"
                        name="gender"
                        value={formData.gender}
                    >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        {...fieldProps}
                        label="Resident District"
                        name="residentDistrict"
                        value={formData.residentDistrict}
                        placeholder="e.g. Kurunegala, Puttalam"
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...fieldProps}
                        label="Permanent Address"
                        name="permanentAddress"
                        value={formData.permanentAddress}
                        multiline
                        minRows={2}
                    />
                </Grid>
            </Grid>
        </FormSection>
    );
}
