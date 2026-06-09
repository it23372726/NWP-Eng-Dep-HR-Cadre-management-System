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

export default function NewAppointmentDialog({
    open,
    onClose,
    onSubmit,
    employeeName
}) {
    const [form, setForm] = useState({
        appointmentDate: today(),
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({ appointmentDate: today(), remarks: "" });
        }
    }, [open]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        onSubmit({
            appointmentDate: form.appointmentDate,
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
            <DialogTitle>New Appointment</DialogTitle>
            <DialogContent dividers>
                <Alert severity="success" sx={{ mb: 2 }}>
                    {employeeName} will be newly appointed to the N.W.P. Engineering Department.
                    Employee becomes active.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Appointment Date"
                            name="appointmentDate"
                            value={form.appointmentDate}
                        />
                    </Grid>
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
                    color="success"
                    onClick={submit}
                >
                    Confirm Appointment
                </Button>
            </DialogActions>
        </Dialog>
    );
}
