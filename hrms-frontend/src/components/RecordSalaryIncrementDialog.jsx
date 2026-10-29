import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField,
    MenuItem,
    Typography
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { dialogActionsSx, datePickerTextFieldProps } from "../utils/formLayout";
import {
    formatSalaryIncrementDate,
    resolveDueDate,
    getMinSalaryIncrementCatchUpDate,
    getMinSalaryIncrementEditDate,
    getMinSalaryIncrementRecordDate,
    getSalaryIncrementRecordHelperText,
    getSingleRecordOptionLabel,
    todayInputValue,
    validateSalaryIncrementCatchUpDate,
    validateSalaryIncrementEditDate,
    validateSalaryIncrementRecordDate
} from "../utils/salaryIncrement";

const toDayjs = (value) => (value ? dayjs(value) : null);

const defaultDoneDate = (status, employee, mode, recordMode) => {
    if (mode === "edit" && status?.lastDoneDate) {
        return status.lastDoneDate;
    }

    const today = todayInputValue();
    const minDate = recordMode === "catchUp"
        ? getMinSalaryIncrementCatchUpDate(status)
        : getMinSalaryIncrementRecordDate(status);

    if (minDate && today < minDate) {
        return minDate;
    }

    return today;
};

export default function RecordSalaryIncrementDialog({
    open,
    onClose,
    onConfirm,
    salaryIncrementStatus,
    employee,
    saving = false,
    mode = "record"
}) {
    const [catchUpThroughYear, setCatchUpThroughYear] = useState("");
    const effectiveStatus = { ...salaryIncrementStatus,
        catchUpTargetDueDate: catchUpThroughYear ? resolveDueDate(
            employee?.incremantDate || salaryIncrementStatus?.catchUpTargetDueDate?.slice(5), Number(catchUpThroughYear)) : salaryIncrementStatus?.catchUpTargetDueDate };
    const isEdit = mode === "edit";
    const canCatchUp = !isEdit && salaryIncrementStatus?.canCatchUpToCurrentYear;
    const [recordMode, setRecordMode] = useState("single");
    const [doneDate, setDoneDate] = useState(todayInputValue());

    useEffect(() => {
        if (open) {
            setRecordMode("single");
            setCatchUpThroughYear(salaryIncrementStatus?.catchUpTargetYear || "");
            setDoneDate(defaultDoneDate(salaryIncrementStatus, employee, mode, "single"));
        }
    }, [open, salaryIncrementStatus, employee, mode]);

    useEffect(() => {
        if (open && !isEdit) {
            setDoneDate(defaultDoneDate(salaryIncrementStatus, employee, mode, recordMode));
        }
    }, [open, recordMode, salaryIncrementStatus, employee, mode, isEdit]);

    const isCatchUp = !isEdit && recordMode === "catchUp";
    const minDate = isEdit
        ? getMinSalaryIncrementEditDate(salaryIncrementStatus)
        : isCatchUp
            ? getMinSalaryIncrementCatchUpDate(effectiveStatus)
            : getMinSalaryIncrementRecordDate(salaryIncrementStatus);
    const maxDate = todayInputValue();
    const minDayjs = minDate ? dayjs(minDate) : undefined;
    const maxDayjs = dayjs(maxDate);
    const validationError = useMemo(() => {
        if (isEdit) {
            return validateSalaryIncrementEditDate(doneDate, salaryIncrementStatus);
        }

        if (isCatchUp) {
            return validateSalaryIncrementCatchUpDate(doneDate, effectiveStatus);
        }

        return validateSalaryIncrementRecordDate(doneDate, salaryIncrementStatus);
    }, [doneDate, salaryIncrementStatus, isEdit, isCatchUp, catchUpThroughYear]);
    const helperMode = isEdit ? "edit" : isCatchUp ? "catchUp" : "record";
    const canSubmit = Boolean(doneDate) && !validationError && (!isCatchUp || Boolean(catchUpThroughYear));

    const handleDateChange = (nextValue) => {
        if (!nextValue?.isValid()) {
            setDoneDate("");
            return;
        }

        let nextDate = nextValue.startOf("day");

        if (minDayjs && nextDate.isBefore(minDayjs, "day")) {
            nextDate = minDayjs;
        }

        if (nextDate.isAfter(maxDayjs, "day")) {
            nextDate = maxDayjs;
        }

        setDoneDate(nextDate.format("YYYY-MM-DD"));
    };

    const handleConfirm = () => {
        onConfirm(doneDate, { catchUpToCurrentYear: isCatchUp, catchUpThroughYear: isCatchUp ? Number(catchUpThroughYear) : undefined });
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
                {isEdit ? "Edit salary increment date" : "Record salary increment"}
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {isEdit
                        ? "Update the date this employee's salary increment was processed."
                        : isCatchUp
                            ? "Mark missed increments through your selected year as done in one step. Later years remain outstanding."
                            : "Record the date this employee's salary increment was processed."}
                    {!isEdit && !isCatchUp && salaryIncrementStatus?.nextDueDate && (
                        <>
                            {" "}
                            The due date is{" "}
                            <strong>
                                {formatSalaryIncrementDate(salaryIncrementStatus.nextDueDate)}
                            </strong>.
                        </>
                    )}
                    {isCatchUp && salaryIncrementStatus?.catchUpTargetDueDate && (
                        <>
                            {" "}
                            The selected year’s due date is{" "}
                            <strong>
                                {formatSalaryIncrementDate(effectiveStatus.catchUpTargetDueDate)}
                            </strong>.
                        </>
                    )}
                </Typography>

                {canCatchUp && (
                    <FormControl sx={{ mb: 2, width: "100%" }}>
                        <RadioGroup
                            value={recordMode}
                            onChange={(event) => setRecordMode(event.target.value)}
                        >
                            <FormControlLabel
                                value="single"
                                control={<Radio />}
                                label={getSingleRecordOptionLabel(salaryIncrementStatus)}
                            />
                            <FormControlLabel
                                value="catchUp"
                                control={<Radio />}
                                label="Catch up through a selected year"
                            />
                        </RadioGroup>
                    </FormControl>
                )}

                {isCatchUp && <TextField select fullWidth label="Catch up through year" value={catchUpThroughYear}
                    onChange={event => setCatchUpThroughYear(Number(event.target.value))} sx={{ mb: 2 }}
                    helperText="Only missing increments up to and including this year will be recorded.">
                    {Array.from({ length: Math.max(0, (salaryIncrementStatus?.catchUpTargetYear || 0) - (salaryIncrementStatus?.nextDueYear || 0) + 1) }, (_, index) => salaryIncrementStatus.nextDueYear + index)
                        .map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                </TextField>}
                <DatePicker
                    label="Increment done date"
                    value={toDayjs(doneDate)}
                    onChange={handleDateChange}
                    minDate={minDayjs}
                    maxDate={maxDayjs}
                    disableFuture
                    slotProps={{
                        textField: {
                            ...datePickerTextFieldProps,
                            error: Boolean(doneDate && validationError),
                            helperText: getSalaryIncrementRecordHelperText(
                                effectiveStatus,
                                helperMode
                            )
                        }
                    }}
                />
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={saving || !canSubmit}
                >
                    {saving ? "Saving..." : isEdit ? "Save changes" : "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
