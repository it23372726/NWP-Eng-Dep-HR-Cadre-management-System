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
    onSubmit
}) {
    const [form, setForm] = useState({
        confirmationDate: today(),
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({ confirmationDate: today(), remarks: "" });
        }
    }, [open]);

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
                    disabled={!form.confirmationDate}
                >
                    Confirm Permanent Status
                </Button>
            </DialogActions>
        </Dialog>
    );
}
