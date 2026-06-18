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

import FormSection from "./FormSection";
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

    const canSave = formData.levelName.trim() && !levelError;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" component="span">
                    {isEdit ? "Edit Service Level" : "Add Service Level"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Define a service level classification for designations and employees.
                </Typography>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    bgcolor: "grey.50",
                    px: { xs: 2, sm: 3 },
                    py: 2
                }}
            >
                <FormSection
                    title="Level Details"
                    description="Enter a descriptive name for this service level."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Level Name"
                                name="levelName"
                                value={formData.levelName}
                                onChange={handleChange}
                                required
                                error={Boolean(levelError)}
                                helperText={
                                    levelError
                                    || `${formData.levelName.length}/${MAX_LENGTH} characters`
                                }
                                inputProps={{ maxLength: MAX_LENGTH }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Examples: Primary, Secondary, Senior, Tertiary, Executive,
                                Special Grade, Technical Level, and similar classifications.
                            </Alert>
                        </Grid>
                    </Grid>
                </FormSection>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submitForm}
                    disabled={!canSave}
                >
                    {isEdit ? "Save Changes" : "Create Service Level"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
