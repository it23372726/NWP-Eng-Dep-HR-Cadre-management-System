import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert
} from "@mui/material";
import { useState, useEffect } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";

const today = () => new Date().toISOString().split("T")[0];

export default function SimpleLifecycleDialog({
    open,
    onClose,
    onSubmit,
    title,
    description,
    severity = "info",
    confirmLabel,
    confirmColor = "primary",
    requireReason = false
}) {
    const [form, setForm] = useState({
        actionDate: today(),
        reason: "",
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({ actionDate: today(), reason: "", remarks: "" });
        }
    }, [open]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        if (requireReason) {
            onSubmit({
                actionDate: form.actionDate,
                reason: form.reason.trim(),
                remarks: form.remarks?.trim() || null
            });
        } else {
            onSubmit({
                actionDate: form.actionDate,
                remarks: form.remarks?.trim() || null
            });
        }
    };

    const disabled = requireReason && !form.reason.trim();

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
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                {description && (
                    <Alert severity={severity} sx={{ mb: 2 }}>
                        {description}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Action Date"
                            name="actionDate"
                            value={form.actionDate}
                        />
                    </Grid>
                    {requireReason && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Reason"
                                name="reason"
                                value={form.reason}
                                required
                            />
                        </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Remarks"
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
                    color={confirmColor}
                    onClick={submit}
                    disabled={disabled}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
