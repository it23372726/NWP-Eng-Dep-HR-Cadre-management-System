import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    Grid,
    Typography,
    MenuItem,
    Alert
} from "@mui/material";
import { useEffect, useState } from "react";

import { DISTRICTS } from "../constants/hrms";
import FormSection from "./FormSection";
import { createFormFieldProps, dialogActionsSx } from "../utils/formLayout";

const emptyForm = {
    name: "",
    district: ""
};

export default function OfficeForm({
    open,
    handleClose,
    handleSubmit,
    selectedOffice
}) {
    const [formData, setFormData] = useState(emptyForm);

    const isEdit = Boolean(selectedOffice);

    useEffect(() => {
        if (selectedOffice) {
            setFormData({
                name: selectedOffice.name ?? "",
                district: selectedOffice.district?.label
                    ?? selectedOffice.district
                    ?? ""
            });
        } else {
            setFormData(emptyForm);
        }
    }, [selectedOffice, open]);

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const submitForm = () => {
        handleSubmit({
            name: formData.name.trim(),
            district: formData.district
        });
    };

    const canSave = formData.name.trim() && formData.district;

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
                    {isEdit ? "Edit Office" : "Add Office"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Register a workplace under Kurunegala or Puttalam district.
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
                    title="Office Details"
                    description="Offices are used when assigning N.W.P. Engineering Department employees."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Office Name"
                                name="name"
                                value={formData.name}
                                placeholder="e.g. Kurunegala District Office"
                                required
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...selectFieldProps}
                                label="District"
                                name="district"
                                value={formData.district}
                                required
                            >
                                {DISTRICTS.map((district) => (
                                    <MenuItem key={district} value={district}>
                                        {district}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Each office name must be unique within its district.
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
                    {isEdit ? "Save Changes" : "Create Office"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
