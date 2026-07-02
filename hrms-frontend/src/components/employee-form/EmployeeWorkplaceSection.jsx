import { Grid, MenuItem, TextField } from "@mui/material";

import { NWP_ENGINEERING_DEPARTMENT } from "../../constants/hrms";
import DateInput from "../DateInput";
import FormSection from "../FormSection";
import MonthDayPicker from "../MonthDayPicker";
import NwpOfficeSelect from "../workplace/NwpOfficeSelect";

export default function EmployeeWorkplaceSection({
    formData,
    fieldProps,
    selectFieldProps,
    variant = "permanent",
    readOnlyWorkplace = false,
    onDistrictChange,
    onOfficeChange,
    onIncrementDateChange
}) {
    const showFirstAppointment = variant === "nonPermanent" || variant === "training";
    const showPresentClassGrade = variant === "nonPermanent";
    const showIncrementDate = variant === "permanent" || variant === "training";
    const showWidowsPension = variant === "permanent";
    const showAllIslandService = variant === "permanent";
    const showContractDates = variant === "contract";
    const showDepartment = variant === "contract";

    return (
        <FormSection
            title="Service & workplace"
            description={
                variant === "permanent"
                    ? "Council service dates. Current department, office, and working district are derived from career history."
                    : variant === "contract"
                        ? "Department, workplace, council dates, and contract period."
                        : variant === "training"
                            ? "Workplace, service dates, and annual increment day."
                            : "Workplace and service dates for this employee."
            }
        >
            <Grid container spacing={2}>
                {showDepartment && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Department"
                            name="currentDepartment"
                            value={formData.currentDepartment || NWP_ENGINEERING_DEPARTMENT}
                            disabled
                        >
                            <MenuItem value={NWP_ENGINEERING_DEPARTMENT}>
                                {NWP_ENGINEERING_DEPARTMENT}
                            </MenuItem>
                        </TextField>
                    </Grid>
                )}
                {showFirstAppointment && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <DateInput
                            {...fieldProps}
                            label="First Appointment"
                            name="dateOfFirstAppointment"
                            value={formData.dateOfFirstAppointment}
                            required={variant === "training"}
                        />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    {readOnlyWorkplace ? (
                        <TextField
                            {...fieldProps}
                            label="N.W.P. Council"
                            name="enteredDateToNWPCouncil"
                            value={formData.enteredDateToNWPCouncil || "—"}
                            disabled
                            helperText="Date first joined N.W.P. Engineering Department (fixed)"
                        />
                    ) : (
                        <DateInput
                            {...fieldProps}
                            label="N.W.P. Council"
                            name="enteredDateToNWPCouncil"
                            value={formData.enteredDateToNWPCouncil}
                            helperText="Entered date to council"
                        />
                    )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    {readOnlyWorkplace ? (
                        <TextField
                            {...fieldProps}
                            label="Reported to Workplace"
                            name="reportedDateToPresentWorkingPlace"
                            value={formData.reportedDateToPresentWorkingPlace || "—"}
                            disabled
                            helperText="Derived from latest workplace change in career history"
                        />
                    ) : (
                        <DateInput
                            {...fieldProps}
                            label="Reported to Workplace"
                            name="reportedDateToPresentWorkingPlace"
                            value={formData.reportedDateToPresentWorkingPlace}
                            helperText="Date reported to current working place"
                        />
                    )}
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
                {showContractDates && (
                    <>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <DateInput
                                {...fieldProps}
                                label="Contract Start"
                                name="contractStartDate"
                                value={formData.contractStartDate}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <DateInput
                                {...fieldProps}
                                label="Contract End"
                                name="contractEndDate"
                                value={formData.contractEndDate}
                            />
                        </Grid>
                    </>
                )}
                {showIncrementDate && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <MonthDayPicker
                            label="Increment Date"
                            name="incremantDate"
                            value={formData.incremantDate}
                            onChange={onIncrementDateChange}
                        />
                    </Grid>
                )}
                {showWidowsPension && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                            {...fieldProps}
                            label="Widows' and Orphans' Pension No."
                            name="widowsOrphansPensionNo"
                            value={formData.widowsOrphansPensionNo}
                            required
                        />
                    </Grid>
                )}
                {showAllIslandService && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <DateInput
                            {...fieldProps}
                            label="All Island Service"
                            name="enteredDateToAllIslandService"
                            value={formData.enteredDateToAllIslandService}
                            helperText="Optional"
                        />
                    </Grid>
                )}
                {showPresentClassGrade && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <DateInput
                            {...fieldProps}
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
