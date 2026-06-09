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
import { useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";

const today = () => new Date().toISOString().split("T")[0];

export default function TransferInDialog({
    open,
    onClose,
    onSubmit,
    employeeName
}) {
    const [form, setForm] = useState({
        effectiveDate: today(),
        transferredFrom: "",
        remarks: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        onSubmit({
            effectiveDate: form.effectiveDate,
            transferredFrom: form.transferredFrom.trim(),
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
            <DialogTitle>Transfer In</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {employeeName} will join the N.W.P. Engineering Department.
                    Designation stays unchanged; employee becomes active.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Effective Date"
                            name="effectiveDate"
                            value={form.effectiveDate}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Transferred From"
                            name="transferredFrom"
                            value={form.transferredFrom}
                            placeholder="e.g. Irrigation Department"
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
                    color="primary"
                    onClick={submit}
                    disabled={!form.transferredFrom.trim()}
                >
                    Confirm Transfer In
                </Button>
            </DialogActions>
        </Dialog>
    );
}
