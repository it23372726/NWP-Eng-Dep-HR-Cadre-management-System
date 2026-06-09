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

export default function TransferOutDialog({
    open,
    onClose,
    onSubmit,
    employeeName
}) {
    const [form, setForm] = useState({
        transferDate: today(),
        transferredTo: "",
        remarks: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const submit = () => {
        onSubmit({
            transferDate: form.transferDate,
            transferredTo: form.transferredTo.trim(),
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
            <DialogTitle>Transfer Out</DialogTitle>
            <DialogContent dividers>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {employeeName} will leave the N.W.P. Engineering Department.
                    Designation stays unchanged; employee becomes inactive.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Transfer Date"
                            name="transferDate"
                            value={form.transferDate}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Transferred To"
                            name="transferredTo"
                            value={form.transferredTo}
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
                    color="warning"
                    onClick={submit}
                    disabled={!form.transferredTo.trim()}
                >
                    Confirm Transfer Out
                </Button>
            </DialogActions>
        </Dialog>
    );
}
