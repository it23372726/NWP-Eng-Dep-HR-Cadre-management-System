import { Grid, MenuItem, TextField } from "@mui/material";

import DateInput from "../DateInput";
import FormSection from "../FormSection";

export default function EmployeePersonalSection({
    formData,
    fieldProps,
    selectFieldProps,
    photoSlot,
    showPrivateVehicleFields = false
}) {
    const showPrivateVehicleDetails = formData.privateVehicleUsedForGovWork === "Yes";
    const isRentedVehicle = formData.privateVehicleRented === "Yes";

    return (
        <>
            <FormSection
                title="Personal details"
                description="Official identification and personal information."
            >
                {photoSlot}
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
                            label="TIN"
                            name="tin"
                            value={formData.tin}
                            helperText="Taxpayer Identification Number (optional)"
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            {...fieldProps}
                            label="Email Address"
                            name="emailAddress"
                            type="email"
                            value={formData.emailAddress}
                            helperText="Optional"
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
                        <DateInput
                            {...fieldProps}
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
                            {...selectFieldProps}
                            label="Marital Status"
                            name="maritalStatus"
                            value={formData.maritalStatus}
                        >
                            <MenuItem value="Married">Married</MenuItem>
                            <MenuItem value="Unmarried">Unmarried</MenuItem>
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

            {showPrivateVehicleFields && (
            <FormSection
                title="Private vehicle for government work"
                description="Record whether this employee uses their own vehicle for official duties such as field visits. Permission must be obtained before fuel reimbursement."
            >
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Uses private vehicle for government work"
                            name="privateVehicleUsedForGovWork"
                            value={formData.privateVehicleUsedForGovWork}
                        >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </TextField>
                    </Grid>
                    {showPrivateVehicleDetails && (
                        <>
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    {...fieldProps}
                                    label="Vehicle"
                                    name="privateVehicleDescription"
                                    value={formData.privateVehicleDescription}
                                    placeholder="e.g. Toyota Hilux"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    label="License plate number"
                                    name="privateVehicleLicensePlateNumber"
                                    value={formData.privateVehicleLicensePlateNumber}
                                    placeholder="e.g. WP ABC-1234"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    label="Insurance number"
                                    name="privateVehicleInsuranceNumber"
                                    value={formData.privateVehicleInsuranceNumber}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    label="Rented vehicle"
                                    name="privateVehicleRented"
                                    value={formData.privateVehicleRented}
                                >
                                    <MenuItem value="Yes">Yes</MenuItem>
                                    <MenuItem value="No">No</MenuItem>
                                </TextField>
                            </Grid>
                            {isRentedVehicle && (
                                <Grid size={{ xs: 12, sm: 8 }}>
                                    <TextField
                                        {...fieldProps}
                                        label="From whom"
                                        name="privateVehicleRentedFrom"
                                        value={formData.privateVehicleRentedFrom}
                                        placeholder="e.g. Vehicle owner or rental company"
                                    />
                                </Grid>
                            )}
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <DateInput
                                    {...fieldProps}
                                    label="Permission date"
                                    name="privateVehiclePermissionDate"
                                    value={formData.privateVehiclePermissionDate}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <DateInput
                                    {...fieldProps}
                                    label="Expire date"
                                    name="privateVehicleExpireDate"
                                    value={formData.privateVehicleExpireDate}
                                    disabled={isRentedVehicle}
                                    helperText={
                                        isRentedVehicle
                                            ? "Auto-set to 2 years from permission date"
                                            : undefined
                                    }
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
            </FormSection>
            )}
        </>
    );
}
