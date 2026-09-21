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
import DateInput from "../DateInput";
import { timelineMinDateHelperText } from "../../utils/timelineDates";
import {
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
    previousEventDate,
    hasCatalogDesignation = false,
    currentSpecialDesignationName = "",
    initialAction = null,
    maxDate = null,
    maxDateHelperText = null
}) {
    const isEdit = Boolean(initialAction);
    const [office, setOffice] = useState("");
    const [district, setDistrict] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [specialDesignationName, setSpecialDesignationName] = useState("");
    const [remarks, setRemarks] = useState("");

    // On edit, "current" workplace is the posting before this office change.
    const fromDepartment = isEdit
        ? (initialAction.fromDepartment || initialAction.department || currentDepartment)
        : currentDepartment;
    const fromOffice = isEdit
        ? (initialAction.fromOffice || currentOffice)
        : currentOffice;
    const fromDistrict = isEdit
        ? null
        : currentDistrictOfWorking;

    const parsed = parseDepartmentValue(fromDepartment);
    const isNwp = parsed.departmentType === DEPARTMENT_OPTIONS.NWP;

    useEffect(() => {
        if (!open) {
            return;
        }
        if (initialAction) {
            setOffice(initialAction.office || initialAction.toOffice || "");
            setDistrict(initialAction.district || "");
            setEffectiveDate(initialAction.actionDate || "");
            setSpecialDesignationName(initialAction.specialDesignationName || "");
            setRemarks(initialAction.remarks || "");
            return;
        }
        setOffice("");
        setDistrict("");
        setEffectiveDate("");
        setSpecialDesignationName(currentSpecialDesignationName ?? "");
        setRemarks("");
    }, [open, initialAction, currentSpecialDesignationName]);

    const { fieldProps } = createFormFieldProps(
        (event) => {
            const { name, value } = event.target;
            if (name === "effectiveDate") {
                setEffectiveDate(value);
            } else if (name === "remarks") {
                setRemarks(value);
            } else if (name === "specialDesignationName") {
                setSpecialDesignationName(value);
            }
        }
    );

    const effectiveOffice = (office.trim() || (isEdit ? "" : fromOffice) || "").trim();
    const effectiveDistrict = district
        || (isEdit ? "" : (fromDistrict?.label || fromDistrict || ""))
        || "";

    const sameOffice = fromOffice
        && effectiveOffice
        && fromOffice.toLowerCase() === effectiveOffice.toLowerCase();
    const sameDistrict = (fromDistrict?.label ?? fromDistrict ?? "") === effectiveDistrict;
    // Create requires a real move. Edit may keep the same destination (e.g. date-only fix).
    const noChange = !isEdit && (isNwp ? (sameOffice && sameDistrict) : sameOffice);

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && effectiveDate
        && effectiveDate < previousEventDate
    );
    const dateAfterMaximum = Boolean(
        maxDate
        && effectiveDate
        && effectiveDate > maxDate
    );

    const submit = () => {
        onSubmit({
            effectiveDate,
            office: effectiveOffice,
            district: isNwp ? effectiveDistrict : null,
            ...(hasCatalogDesignation
                ? { specialDesignationName: specialDesignationName.trim() }
                : {}),
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
            <DialogTitle>
                {isEdit ? "Edit Office Change" : "Office Change"}
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {isEdit
                        ? `Revise the office change for ${employeeName}.`
                        : `Update ${employeeName}'s office within the same department. This is not a transfer.`}
                </Alert>
                <Grid container spacing={2}>
                    <ReadonlyWorkplaceFields
                        department={fromDepartment}
                        office={fromOffice}
                        district={fromDistrict}
                    />
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Effective Date"
                            name="effectiveDate"
                            value={effectiveDate}
                            required
                            slotProps={{
                                htmlInput: {
                                    ...(previousEventDate ? { min: previousEventDate } : {}),
                                    ...(maxDate ? { max: maxDate } : {})
                                }
                            }}
                            error={dateBeforeMinimum || dateAfterMaximum}
                            helperText={
                                dateBeforeMinimum
                                    ? timelineMinDateHelperText(
                                        previousEventDate,
                                        { tooEarly: true }
                                    )
                                    : dateAfterMaximum
                                        ? (maxDateHelperText || `Cannot be later than ${maxDate}.`)
                                        : (maxDateHelperText
                                            || timelineMinDateHelperText(previousEventDate))
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
                    {hasCatalogDesignation && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Special designation at the new office (optional)"
                                name="specialDesignationName"
                                value={specialDesignationName}
                                helperText="Local title for the same designation, service and grade. Leave empty to use the declared designation."
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
                        || dateAfterMaximum
                        || !effectiveOffice
                        || (isNwp && !effectiveDistrict)
                        || noChange
                    }
                >
                    {isEdit ? "Save changes" : "Confirm Office Change"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
