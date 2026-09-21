import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import { dialogActionsSx } from "../utils/formLayout";
import {
    formatSalaryIncrementDoneDate,
    isLatestCatchUpOperation
} from "../utils/salaryIncrement";

export default function UndoSalaryIncrementDialog({
    open,
    onClose,
    onConfirm,
    salaryIncrementStatus,
    saving = false
}) {
    const catchUp = isLatestCatchUpOperation(salaryIncrementStatus);
    const fromYear = salaryIncrementStatus?.lastOperationFromYear;
    const toYear = salaryIncrementStatus?.lastOperationToYear
        ?? salaryIncrementStatus?.lastDueYear;
    const lastDoneDate = salaryIncrementStatus?.lastDoneDate;
    const legacyImported = salaryIncrementStatus?.lastOperationType === "LEGACY_IMPORT"
        && !lastDoneDate;

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
            <DialogTitle>Undo salary increment</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary">
                    {catchUp && fromYear && toYear
                        ? `Undo the catch-up covering ${fromYear}–${toYear}`
                        : `Undo the increment recorded for ${toYear ?? "the latest year"}`}
                    {lastDoneDate && (
                        <>
                            {" "}
                            (
                            <strong>
                                {formatSalaryIncrementDoneDate(lastDoneDate)}
                            </strong>
                            )
                        </>
                    )}
                    . The employee&apos;s increment schedule will be recalculated from
                    remaining yearly records.
                </Typography>
                {legacyImported && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Completion date unavailable — imported from legacy increment status.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={onConfirm}
                    disabled={saving}
                >
                    {saving ? "Undoing..." : "Undo increment"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
