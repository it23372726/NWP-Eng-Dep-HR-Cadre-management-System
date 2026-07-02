import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import { dialogActionsSx } from "../utils/formLayout";
import { formatSalaryIncrementDate, wasMultiYearCatchUp } from "../utils/salaryIncrement";

export default function UndoSalaryIncrementDialog({
    open,
    onClose,
    onConfirm,
    lastDoneDate,
    lastDueYear,
    salaryIncrementStatus,
    saving = false
}) {
    const multiYearCatchUp = wasMultiYearCatchUp(salaryIncrementStatus);

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
                    {multiYearCatchUp
                        ? "This will undo the catch-up and restore the employee's previous increment status."
                        : "This will revert the last recorded salary increment"}
                    {!multiYearCatchUp && lastDueYear && (
                        <>
                            {" "}
                            for <strong>{lastDueYear}</strong>
                        </>
                    )}
                    {lastDoneDate && (
                        <>
                            {" "}
                            (
                            <strong>
                                {formatSalaryIncrementDate(lastDoneDate)}
                            </strong>
                            )
                        </>
                    )}
                    . The employee&apos;s increment schedule will be recalculated.
                </Typography>
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
