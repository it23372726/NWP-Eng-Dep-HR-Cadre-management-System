import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert,
    Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import { timelineMinDateHelperText } from "../../utils/timelineDates";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    parseDepartmentValue,
    ReadonlyWorkplaceFields
} from "../workplace/DepartmentOfficeFields";
import NwpOfficeSelect from "../workplace/NwpOfficeSelect";

export default function OfficeChangeDialog({
    open,
    onClose,
    onSubmit,
    employeeName,
    currentDepartment,
    currentOffice,
    currentDistrictOfWorking,
    previousEventDate
}) {
    const [office, setOffice] = useState("");
    const [district, setDistrict] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [remarks, setRemarks] = useState("");

    const parsed = parseDepartmentValue(currentDepartment);
    const isNwp = parsed.departmentType === DEPARTMENT_OPTIONS.NWP;

    useEffect(() => {
        if (open) {
            setOffice("");
            setDistrict("");
            setEffectiveDate("");
            setRemarks("");
        }
    }, [open]);

    const { fieldProps, dateFieldProps } = createFormFieldProps(
        (event) => {
            const { name, value } = event.target;
            if (name === "effectiveDate") {
                setEffectiveDate(value);
            } else if (name === "remarks") {
                setRemarks(value);
            }
        }
    );

    const effectiveOffice = (office.trim() || currentOffice || "").trim();
    const effectiveDistrict = district || currentDistrictOfWorking?.label
        || currentDistrictOfWorking
        || "";

    const sameOffice = currentOffice
        && effectiveOffice
        && currentOffice.toLowerCase() === effectiveOffice.toLowerCase();
    const sameDistrict = (currentDistrictOfWorking?.label
        ?? currentDistrictOfWorking
        ?? "") === effectiveDistrict;
    const noChange = isNwp ? (sameOffice && sameDistrict) : sameOffice;

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && effectiveDate
        && effectiveDate < previousEventDate
    );

    const submit = () => {
        onSubmit({
            effectiveDate,
            office: effectiveOffice,
            district: isNwp ? effectiveDistrict : null,
            remarks: remarks?.trim() || null
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle>Office Change</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Update {employeeName}&apos;s office within the same department.
                    This is not a transfer.
                </Alert>
                <Grid container spacing={2}>
                    <ReadonlyWorkplaceFields
                        department={currentDepartment}
                        office={currentOffice}
                        district={currentDistrictOfWorking}
                    />
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Effective Date"
                            name="effectiveDate"
                            value={effectiveDate}
                            required
                            slotProps={{
                                ...dateFieldProps.slotProps,
                                htmlInput: previousEventDate
                                    ? { min: previousEventDate }
                                    : undefined
                            }}
                            error={dateBeforeMinimum}
                            helperText={
                                dateBeforeMinimum
                                    ? timelineMinDateHelperText(
                                        previousEventDate,
                                        { tooEarly: true }
                                    )
                                    : timelineMinDateHelperText(previousEventDate)
                            }
                        />
                    </Grid>
                    {isNwp ? (
                        <NwpOfficeSelect
                            district={district}
                            office={office}
                            onDistrictChange={setDistrict}
                            onOfficeChange={setOffice}
                            districtLabelText="New Working District"
                            officeLabel="New Office"
                        />
                    ) : (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="New Office"
                                name="office"
                                value={office}
                                onChange={(event) => setOffice(event.target.value)}
                                required
                            />
                        </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Remarks"
                            name="remarks"
                            value={remarks}
                            multiline
                            minRows={2}
                        />
                    </Grid>
                    {noChange && (
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="body2" color="error">
                                {isNwp
                                    ? "Change the office, working district, or both."
                                    : "Change the office."}
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submit}
                    disabled={
                        !effectiveDate
                        || dateBeforeMinimum
                        || !effectiveOffice
                        || (isNwp && !effectiveDistrict)
                        || noChange
                    }
                >
                    Confirm Office Change
                </Button>
            </DialogActions>
        </Dialog>
    );
}
