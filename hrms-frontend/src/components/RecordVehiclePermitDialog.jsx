import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { dialogActionsSx, datePickerTextFieldProps } from "../utils/formLayout";
import {
    formatVehiclePermitDate,
    getMinVehiclePermitCollectionDate,
    getMinVehiclePermitEditDate,
    getVehiclePermitCollectionHelperText,
    todayInputValue,
    validateVehiclePermitCollectionDate,
    validateVehiclePermitEditDate
} from "../utils/vehiclePermit";

const toDayjs = (value) => (value ? dayjs(value) : null);

const defaultCollectedDate = (status, mode) => {
    if (mode === "edit" && status?.lastCollectedDate) {
        return status.lastCollectedDate;
    }

    const today = todayInputValue();
    const minDate = getMinVehiclePermitCollectionDate(status);

    if (minDate && today < minDate) {
        return minDate;
    }

    return today;
};

export default function RecordVehiclePermitDialog({
    open,
    onClose,
    onConfirm,
    vehiclePermitStatus,
    saving = false,
    mode = "record"
}) {
    const isEdit = mode === "edit";
    const [collectedDate, setCollectedDate] = useState(todayInputValue());

    useEffect(() => {
        if (open) {
            setCollectedDate(defaultCollectedDate(vehiclePermitStatus, mode));
        }
    }, [open, vehiclePermitStatus, mode]);

    const minDate = isEdit
        ? getMinVehiclePermitEditDate(vehiclePermitStatus)
        : getMinVehiclePermitCollectionDate(vehiclePermitStatus);
    const maxDate = todayInputValue();
    const minDayjs = minDate ? dayjs(minDate) : undefined;
    const maxDayjs = dayjs(maxDate);
    const validationError = useMemo(
        () => (isEdit
            ? validateVehiclePermitEditDate(collectedDate, vehiclePermitStatus)
            : validateVehiclePermitCollectionDate(collectedDate, vehiclePermitStatus)),
        [collectedDate, vehiclePermitStatus, isEdit]
    );
    const canSubmit = Boolean(collectedDate) && !validationError;

    const handleDateChange = (nextValue) => {
        if (!nextValue?.isValid()) {
            setCollectedDate("");
            return;
        }

        let nextDate = nextValue.startOf("day");

        if (minDayjs && nextDate.isBefore(minDayjs, "day")) {
            nextDate = minDayjs;
        }

        if (nextDate.isAfter(maxDayjs, "day")) {
            nextDate = maxDayjs;
        }

        setCollectedDate(nextDate.format("YYYY-MM-DD"));
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
                {isEdit ? "Edit vehicle permit collection" : "Record vehicle permit collection"}
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {isEdit
                        ? "Update the date this Senior employee collected their vehicle permit."
                        : "Record the date this Senior employee collected their vehicle permit."}
                    {vehiclePermitStatus?.seniorSinceDate && (
                        <>
                            {" "}
                            They became Senior on{" "}
                            <strong>
                                {formatVehiclePermitDate(vehiclePermitStatus.seniorSinceDate)}
                            </strong>.
                        </>
                    )}
                </Typography>
                <DatePicker
                    label="Collected date"
                    value={toDayjs(collectedDate)}
                    onChange={handleDateChange}
                    minDate={minDayjs}
                    maxDate={maxDayjs}
                    disableFuture
                    slotProps={{
                        textField: {
                            ...datePickerTextFieldProps,
                            error: Boolean(collectedDate && validationError),
                            helperText: getVehiclePermitCollectionHelperText(
                                vehiclePermitStatus,
                                mode
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
                    onClick={() => onConfirm(collectedDate)}
                    disabled={saving || !canSubmit}
                >
                    {saving ? "Saving..." : isEdit ? "Save changes" : "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
