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
import { useEffect, useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import DateInput from "../DateInput";
import { timelineMinDateHelperText } from "../../utils/timelineDates";

export default function TransferInDialog({
    open,
    onClose,
    onSubmit,
    employeeName,
    previousEventDate,
    initialAction = null,
    maxDate = null,
    maxDateHelperText = null
}) {
    const isEdit = Boolean(initialAction);
    const [form, setForm] = useState({
        effectiveDate: "",
        transferredFrom: "",
        remarks: ""
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        if (initialAction) {
            setForm({
                effectiveDate: initialAction.actionDate || "",
                transferredFrom: initialAction.transferredFrom || "",
                remarks: initialAction.remarks || ""
            });
            return;
        }
        setForm({ effectiveDate: "", transferredFrom: "", remarks: "" });
    }, [open, initialAction]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && form.effectiveDate
        && form.effectiveDate < previousEventDate
    );
    const dateAfterMaximum = Boolean(
        maxDate
        && form.effectiveDate
        && form.effectiveDate > maxDate
    );

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
            <DialogTitle>
                {isEdit ? "Edit Transfer In" : "Transfer In"}
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {isEdit
                        ? `Revise the transfer-in record for ${employeeName}.`
                        : `${employeeName} will join the N.W.P. Engineering Department. Designation stays unchanged; employee becomes active.`}
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Effective Date"
                            name="effectiveDate"
                            value={form.effectiveDate}
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
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Transferred From"
                            name="transferredFrom"
                            value={form.transferredFrom}
                            placeholder="e.g. Irrigation Department"
                            required
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
                    disabled={
                        !form.effectiveDate
                        || !form.transferredFrom.trim()
                        || dateBeforeMinimum
                        || dateAfterMaximum
                    }
                >
                    {isEdit ? "Save changes" : "Confirm Transfer In"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
