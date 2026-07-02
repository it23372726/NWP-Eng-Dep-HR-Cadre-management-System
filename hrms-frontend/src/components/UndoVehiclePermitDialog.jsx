import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import { dialogActionsSx } from "../utils/formLayout";
import { formatVehiclePermitDate } from "../utils/vehiclePermit";

export default function UndoVehiclePermitDialog({
    open,
    onClose,
    onConfirm,
    lastCollectedDate,
    saving = false
}) {
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
            <DialogTitle>Undo vehicle permit collection</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary">
                    This will remove the recorded collection date
                    {lastCollectedDate && (
                        <>
                            {" "}
                            (
                            <strong>
                                {formatVehiclePermitDate(lastCollectedDate)}
                            </strong>
                            )
                        </>
                    )}
                    . The employee&apos;s next collectable date will be recalculated
                    from their Senior start date.
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
                    {saving ? "Undoing..." : "Undo collection"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
