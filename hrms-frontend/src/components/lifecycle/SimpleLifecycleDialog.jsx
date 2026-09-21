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

export default function SimpleLifecycleDialog({
    open,
    onClose,
    onSubmit,
    title,
    description,
    severity = "info",
    confirmLabel,
    confirmColor = "primary",
    requireReason = false,
    previousEventDate,
    maxDate = null,
    maxDateHelperText = null,
    hideDateField = false,
    initialAction = null
}) {
    const isEdit = Boolean(initialAction);
    const [form, setForm] = useState({
        actionDate: "",
        reason: "",
        remarks: ""
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        if (initialAction) {
            setForm({
                actionDate: initialAction.actionDate || "",
                reason: initialAction.reason || "",
                remarks: initialAction.remarks || ""
            });
            return;
        }
        setForm({ actionDate: "", reason: "", remarks: "" });
    }, [open, initialAction]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && form.actionDate
        && form.actionDate < previousEventDate
    );
    const dateAfterMaximum = Boolean(
        maxDate
        && form.actionDate
        && form.actionDate > maxDate
    );

    const submit = () => {
        const payload = {
            actionDate: hideDateField ? null : form.actionDate,
            remarks: form.remarks?.trim() || null
        };
        if (requireReason) {
            payload.reason = form.reason.trim();
        }
        onSubmit(payload);
    };

    const valid = (hideDateField || form.actionDate)
        && (!requireReason || form.reason.trim())
        && !dateBeforeMinimum
        && !dateAfterMaximum;

    const dateHelper = dateBeforeMinimum
        ? timelineMinDateHelperText(previousEventDate, { tooEarly: true })
        : dateAfterMaximum
            ? (maxDateHelperText
                || `Cannot be later than ${maxDate}.`)
            : (maxDateHelperText || timelineMinDateHelperText(previousEventDate));

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
                    {!hideDateField && (
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Action Date"
                            name="actionDate"
                            value={form.actionDate}
                            required
                            slotProps={{
                                htmlInput: {
                                    ...(previousEventDate ? { min: previousEventDate } : {}),
                                    ...(maxDate ? { max: maxDate } : {})
                                }
                            }}
                            error={dateBeforeMinimum || dateAfterMaximum}
                            helperText={dateHelper}
                        />
                    </Grid>
                    )}
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
                    disabled={!valid}
                >
                    {isEdit ? "Save changes" : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
