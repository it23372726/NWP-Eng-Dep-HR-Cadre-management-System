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
import { combineMinDates, timelineMinDateHelperText } from "../../utils/timelineDates";

export default function MakePermanentDialog({
    open,
    onClose,
    employeeName,
    minDate,
    previousEventDate,
    onSubmit
}) {
    const [form, setForm] = useState({
        confirmationDate: "",
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({ confirmationDate: "", remarks: "" });
        }
    }, [open]);

    const effectiveMinDate = combineMinDates(minDate, previousEventDate);
    const dateBeforeMinimum = Boolean(
        effectiveMinDate
        && form.confirmationDate
        && form.confirmationDate < effectiveMinDate
    );

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        onSubmit({
            confirmationDate: form.confirmationDate,
            remarks: form.remarks?.trim() || null
        });
    };

    const helperText = dateBeforeMinimum
        ? timelineMinDateHelperText(effectiveMinDate, { tooEarly: true })
        : effectiveMinDate
            ? timelineMinDateHelperText(effectiveMinDate)
            : undefined;

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
            <DialogTitle>Make Permanent</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Confirm permanent status for {employeeName}. The confirmation date must be entered by HR.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Confirmation Date"
                            name="confirmationDate"
                            value={form.confirmationDate}
                            required
                            slotProps={{
                                ...dateFieldProps.slotProps,
                                htmlInput: effectiveMinDate
                                    ? { min: effectiveMinDate }
                                    : undefined
                            }}
                            error={dateBeforeMinimum}
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
                    disabled={!form.confirmationDate || dateBeforeMinimum}
                >
                    Confirm Permanent Status
                </Button>
            </DialogActions>
        </Dialog>
    );
}
