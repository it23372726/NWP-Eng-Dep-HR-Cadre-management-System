import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import DateInput from "../DateInput";
import { combineMinDates, timelineMinDateHelperText } from "../../utils/timelineDates";

export default function MakePermanentDialog({
    open,
    onClose,
    employeeName,
    minDate,
    previousEventDate,
    maxDate = null,
    maxDateHelperText = null,
    onSubmit,
    initialAction = null
}) {
    const isEdit = Boolean(initialAction);
    const [form, setForm] = useState({
        confirmationDate: "",
        remarks: ""
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        if (initialAction) {
            setForm({
                confirmationDate: initialAction.actionDate || "",
                remarks: initialAction.remarks || ""
            });
            return;
        }
        setForm({ confirmationDate: "", remarks: "" });
    }, [open, initialAction]);

    const keepsRecordedDate = Boolean(
        initialAction?.actionDate
        && form.confirmationDate === initialAction.actionDate
    );
    const effectiveMinDate = keepsRecordedDate
        ? null
        : combineMinDates(minDate, previousEventDate);
    const dateBeforeMinimum = Boolean(
        !keepsRecordedDate
        && effectiveMinDate
        && form.confirmationDate
        && form.confirmationDate < effectiveMinDate
    );
    const dateAfterMaximum = Boolean(
        !keepsRecordedDate
        && maxDate
        && form.confirmationDate
        && form.confirmationDate > maxDate
    );

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        onSubmit({
            confirmationDate: form.confirmationDate,
            remarks: form.remarks?.trim() || null
        });
    };

    const helperText = dateBeforeMinimum
        ? timelineMinDateHelperText(effectiveMinDate, { tooEarly: true })
        : dateAfterMaximum
            ? (maxDateHelperText || `Cannot be later than ${maxDate}.`)
            : maxDateHelperText
                || (effectiveMinDate
                    ? timelineMinDateHelperText(effectiveMinDate)
                    : undefined);

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
                {isEdit ? "Edit Permanent Confirmation" : "Make Permanent"}
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {isEdit
                        ? `Revise the permanent confirmation for ${employeeName}.`
                        : `Confirm permanent status for ${employeeName}. The confirmation date must be entered by HR.`}
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Confirmation Date"
                            name="confirmationDate"
                            value={form.confirmationDate}
                            required
                            slotProps={{
                                htmlInput: {
                                    ...(effectiveMinDate ? { min: effectiveMinDate } : {}),
                                    ...(maxDate && !keepsRecordedDate ? { max: maxDate } : {})
                                }
                            }}
                            error={dateBeforeMinimum || dateAfterMaximum}
                            helperText={helperText}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Remark"
                            name="remarks"
                            value={form.remarks}
                            multiline
                            minRows={2}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submit}
                    disabled={!form.confirmationDate || dateBeforeMinimum || dateAfterMaximum}
                >
                    {isEdit ? "Save changes" : "Confirm Permanent Status"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
