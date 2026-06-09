import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    Grid,
    Typography
} from "@mui/material";

import { useEffect, useState } from "react";

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
    }, [selectedService, open]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const { fieldProps } = createFormFieldProps(handleChange);

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
                {isEdit ? "Edit Service" : "Add Service"}
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                >
                    Service details
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Service Code"
                            name="serviceCode"
                            value={formData.serviceCode}
                            placeholder="e.g. SLEgS"
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
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>

                <Button
                    variant="contained"
                    onClick={() => handleSubmit(formData)}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
