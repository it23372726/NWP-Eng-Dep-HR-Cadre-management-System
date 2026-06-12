import { Grid, MenuItem, TextField } from "@mui/material";

import { DISTRICTS } from "../../constants/hrms";
import FormSection from "../FormSection";

export default function EmployeeWorkplaceSection({
    formData,
    fieldProps,
    dateFieldProps,
    selectFieldProps,
    variant = "permanent"
}) {
    const showFirstAppointment = variant === "nonPermanent";
    const showPresentClassGrade = variant === "nonPermanent";
    const showOptionalDates = variant === "permanent";

    return (
        <FormSection
            title="Service & workplace"
            description={
                variant === "permanent"
                    ? "Current posting details and council service dates not captured in career history."
                    : "Workplace and service dates for this employee."
            }
        >
            <Grid container spacing={2}>
                {showFirstAppointment && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                            {...dateFieldProps}
                            label="First Appointment"
                            name="dateOfFirstAppointment"
                            value={formData.dateOfFirstAppointment}
                        />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                        {...dateFieldProps}
                        label="N.W.P. Council"
                        name="enteredDateToNWPCouncil"
                        value={formData.enteredDateToNWPCouncil}
                        helperText="Entered date to council"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                        {...dateFieldProps}
                        label="Reported to Workplace"
                        name="reportedDateToPresentWorkingPlace"
                        value={formData.reportedDateToPresentWorkingPlace}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                        {...fieldProps}
                        label="Current Working Place"
                        name="currentWorkingPlace"
                        value={formData.currentWorkingPlace}
                        placeholder="Office / station name"
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        {...selectFieldProps}
                        label="Working District"
                        name="currentDistrictOfWorking"
                        value={formData.currentDistrictOfWorking}
                    >
                        {DISTRICTS.map((district) => (
                            <MenuItem key={district} value={district}>
                                {district}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                {showOptionalDates && (
                    <>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="Incremant Date"
                                name="incremantDate"
                                value={formData.incremantDate}
                                placeholder="e.g. 02-Jul"
                                helperText="Month-Day only (e.g., 02-Jul)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="All Island Service"
                                name="enteredDateToAllIslandService"
                                value={formData.enteredDateToAllIslandService}
                                helperText="Optional"
                            />
                        </Grid>
                    </>
                )}
                {showPresentClassGrade && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Present Class / Grade"
                            name="appointmentDateToPresentClassGrade"
                            value={formData.appointmentDateToPresentClassGrade}
                        />
                    </Grid>
                )}
            </Grid>
        </FormSection>
    );
}
