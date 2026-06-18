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

const emptyForm = {
    serviceCode: "",
    description: ""
};

export default function ServiceForm({
    open,
    handleClose,
    handleSubmit,
    selectedService
}) {
    const [formData, setFormData] = useState(emptyForm);
    const [codeError, setCodeError] = useState("");

    const isEdit = Boolean(selectedService);

    useEffect(() => {
        if (selectedService) {
            setFormData({
                serviceCode: selectedService.serviceCode ?? "",
                description: selectedService.description ?? ""
            });
        } else {
            setFormData(emptyForm);
        }
        setCodeError("");
    }, [selectedService, open]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (e.target.name === "serviceCode") {
            setCodeError("");
        }
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const submitForm = () => {
        const trimmedCode = formData.serviceCode.trim();
        const trimmedDescription = formData.description.trim();

        if (!trimmedCode) {
            setCodeError("Service code is required");
            return;
        }

        handleSubmit({
            serviceCode: trimmedCode,
            description: trimmedDescription
        });
    };

    const canSave =
        formData.serviceCode.trim() && formData.description.trim();

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
                    {isEdit ? "Edit Service" : "Add Service"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Define a service classification for designations and employees.
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
                    title="Service Details"
                    description="Enter the service code and a clear description."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Service Code"
                                name="serviceCode"
                                value={formData.serviceCode}
                                placeholder="e.g. SLEgS"
                                required
                                error={Boolean(codeError)}
                                helperText={codeError || "Short unique identifier"}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Description"
                                name="description"
                                value={formData.description}
                                multiline
                                minRows={2}
                                required
                                placeholder="Full service name or description"
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Service codes are used across designations and reports.
                                Use a consistent, recognizable code for each service type.
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
                    {isEdit ? "Save Changes" : "Create Service"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
