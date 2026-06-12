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

const today = () => new Date().toISOString().split("T")[0];

export default function MakePermanentDialog({
    open,
    onClose,
    employeeName,
    minDate,
    onSubmit
}) {
    const defaultConfirmationDate = () => {
        const current = today();
        return minDate && current < minDate ? minDate : current;
    };

    const [form, setForm] = useState({
        confirmationDate: defaultConfirmationDate(),
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({ confirmationDate: defaultConfirmationDate(), remarks: "" });
        }
    }, [open, minDate]);

    const dateBeforeMinimum = Boolean(
        minDate
        && form.confirmationDate
        && form.confirmationDate < minDate
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
                                htmlInput: minDate ? { min: minDate } : undefined
                            }}
                            error={dateBeforeMinimum}
                            helperText={
                                dateBeforeMinimum
                                    ? `Confirmation date cannot be earlier than ${minDate} (end of the 3-year probation period).`
                                    : minDate
                                        ? `Earliest allowed date: ${minDate} (end of the 3-year probation period).`
                                        : undefined
                            }
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
