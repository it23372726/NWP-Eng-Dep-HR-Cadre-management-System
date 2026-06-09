import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    Typography,
    Alert
} from "@mui/material";

import { useEffect, useState } from "react";

import { getDesignations } from "../services/designationService";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";

const emptyForm = {
    designationId: "",
    approvedCount: ""
};

export default function CadreForm({
    open,
    handleClose,
    handleSubmit,
    selectedCadre
}) {
    const [designations, setDesignations] = useState([]);
    const [formData, setFormData] = useState(emptyForm);

    const isEdit = Boolean(selectedCadre);

    useEffect(() => {
        loadDesignations();
    }, []);

    useEffect(() => {
        if (selectedCadre) {
            setFormData({
                designationId: selectedCadre.designation?.id ?? "",
                approvedCount: selectedCadre.approvedCount ?? ""
            });
        } else {
            setFormData(emptyForm);
        }
    }, [selectedCadre, open]);

    const loadDesignations = async () => {
        const data = await getDesignations();
        setDesignations(data);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const selectedDesignation = designations.find(
        (d) => d.id === Number(formData.designationId)
    );

    const submitForm = () => {
        handleSubmit({
            designationId: Number(formData.designationId),
            approvedCount: Number(formData.approvedCount)
        });
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
                {isEdit ? "Edit Cadre Position" : "Add Cadre Position"}
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                >
                    Cadre position
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Designation"
                            name="designationId"
                            value={formData.designationId}
                        >
                            {designations.map((designation) => (
                                <MenuItem
                                    key={designation.id}
                                    value={designation.id}
                                >
                                    {designation.designationName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {selectedDesignation && (
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Service:{" "}
                                {selectedDesignation.service?.serviceCode} —{" "}
                                {selectedDesignation.service?.description}
                                <br />
                                Service level:{" "}
                                {selectedDesignation.serviceLevel?.levelName}
                            </Alert>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Approved Count"
                            name="approvedCount"
                            type="number"
                            value={formData.approvedCount}
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={submitForm}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
