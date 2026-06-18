import { Grid, TextField } from "@mui/material";

import FormSection from "../FormSection";
import MonthDayPicker from "../MonthDayPicker";
import NwpOfficeSelect from "../workplace/NwpOfficeSelect";

export default function EmployeeWorkplaceSection({
    formData,
    fieldProps,
    dateFieldProps,
    variant = "permanent",
    readOnlyWorkplace = false,
    onDistrictChange,
    onOfficeChange,
    onIncrementDateChange
}) {
    const showFirstAppointment = variant === "nonPermanent";
    const showPresentClassGrade = variant === "nonPermanent";
    const showOptionalDates = variant === "permanent";

    return (
        <FormSection
            title="Service & workplace"
            description={
                variant === "permanent"
                    ? "Council service dates. Current department, office, and working district are derived from career history."
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
                        helperText="Date joined N.W.P. Engineering Department"
                    />
                </Grid>
                {readOnlyWorkplace ? (
                    <>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Current Department"
                                name="currentDepartment"
                                value={formData.currentDepartment || "—"}
                                disabled
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Current Office"
                                name="currentOffice"
                                value={formData.currentOffice || "—"}
                                disabled
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Working District"
                                name="currentDistrictOfWorking"
                                value={formData.currentDistrictOfWorking || "—"}
                                disabled
                            />
                        </Grid>
                    </>
                ) : (
                    <NwpOfficeSelect
                        district={formData.currentDistrictOfWorking || ""}
                        office={formData.currentWorkingPlace || ""}
                        onDistrictChange={onDistrictChange}
                        onOfficeChange={onOfficeChange}
                        districtLabelText="Working District"
                        officeLabel="Office"
                    />
                )}
                {showOptionalDates && (
                    <>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <MonthDayPicker
                                label="Increment Date"
                                name="incremantDate"
                                value={formData.incremantDate}
                                onChange={onIncrementDateChange}
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
