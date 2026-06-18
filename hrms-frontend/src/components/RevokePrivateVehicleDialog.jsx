import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import { dialogActionsSx } from "../utils/formLayout";

export default function RevokePrivateVehicleDialog({
    open,
    onClose,
    onConfirm,
    employeeName,
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
            <DialogTitle>Stop using private vehicle</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary">
                    This will remove private vehicle permission from{" "}
                    <strong>{employeeName}</strong>&apos;s profile. They will no
                    longer be listed as using a private vehicle for government
                    work.
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
                    {saving ? "Saving..." : "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
