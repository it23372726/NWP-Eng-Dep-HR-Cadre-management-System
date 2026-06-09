import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    Grid,
    Typography,
    Alert
} from "@mui/material";

import { useEffect, useState } from "react";

import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";

const MAX_LENGTH = 100;

const emptyForm = {
    levelName: ""
};

export default function ServiceLevelForm({
    open,
    handleClose,
    handleSubmit,
    selectedLevel
}) {
    const [formData, setFormData] = useState(emptyForm);
    const [levelError, setLevelError] = useState("");

    const isEdit = Boolean(selectedLevel);

    useEffect(() => {
        if (selectedLevel) {
            setFormData({
                levelName: selectedLevel.levelName ?? ""
            });
        } else {
            setFormData(emptyForm);
        }
        setLevelError("");
    }, [selectedLevel, open]);

    const handleChange = (e) => {
        const value = e.target.value;
        setFormData({ levelName: value });

        if (value && value.length > MAX_LENGTH) {
            setLevelError(`Level name must not exceed ${MAX_LENGTH} characters`);
        } else {
            setLevelError("");
        }
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const submitForm = () => {
        const trimmedName = formData.levelName.trim();

        if (!trimmedName) {
            setLevelError("Level name is required");
            return;
        }

        if (trimmedName.length > MAX_LENGTH) {
            setLevelError(`Level name must not exceed ${MAX_LENGTH} characters`);
            return;
        }

        handleSubmit({ levelName: trimmedName });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle>
                {isEdit ? "Edit Service Level" : "Add Service Level"}
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                >
                    Level details
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Level Name"
                            name="levelName"
                            value={formData.levelName}
                            onChange={handleChange}
                            error={Boolean(levelError)}
                            helperText={levelError || "Enter a custom service level name"}
                            inputProps={{ maxLength: MAX_LENGTH }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Alert severity="info">
                            Enter any custom service level name. Examples: Primary, Secondary,
                            Senior, Tertiary, Executive, Special Grade, Technical Level, etc.
                        </Alert>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submitForm}
                    disabled={!formData.levelName.trim() || Boolean(levelError)}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
