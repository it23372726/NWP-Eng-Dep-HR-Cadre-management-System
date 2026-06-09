import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    Stack
} from "@mui/material";
import { useState, useEffect } from "react";
import { dialogActionsSx } from "../utils/formLayout";

export default function DeleteEmployeeDialog({
    open,
    onClose,
    onSubmit,
    employeeName
}) {
    const [confirmText, setConfirmText] = useState("");

    useEffect(() => {
        if (open) {
            setConfirmText("");
        }
    }, [open]);

    const handleChange = (e) => {
        setConfirmText(e.target.value);
    };

    const submit = () => {
        if (confirmText === "DELETE") {
            onSubmit();
        }
    };

    const isEnabled = confirmText === "DELETE";

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
            <DialogTitle>Permanent Employee Deletion</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="error">
                        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                            WARNING - This action CANNOT be undone
                        </Typography>
                        You are about to permanently delete {employeeName} from the system.
                    </Alert>

                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                            All the following data will be removed:
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • Employee master record
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • Lifecycle Action History
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • All assignments and transfers
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • Promotion and career progression records
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • Retirement and resignation records
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                            • Any linked employee data
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                            To confirm, type DELETE below:
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Type DELETE to continue"
                            value={confirmText}
                            onChange={handleChange}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={submit}
                    disabled={!isEnabled}
                >
                    Delete Permanently
                </Button>
            </DialogActions>
        </Dialog>
    );
}
