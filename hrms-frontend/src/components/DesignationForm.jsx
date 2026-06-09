import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    MenuItem,
    Grid,
    Typography,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormHelperText,
    Alert
} from "@mui/material";

import { useEffect, useState } from "react";

import { getServices } from "../services/serviceService";
import { getServiceLevels } from "../services/serviceLevelService";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";
import { GRADES } from "../constants/hrms";

const emptyForm = {
    designationName: "",
    serviceId: "",
    serviceLevelId: "",
    allowedGrades: [],
    salaryCode: ""
};

export default function DesignationForm({
    open,
    handleClose,
    handleSubmit,
    selectedDesignation
}) {
    const [services, setServices] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [gradeError, setGradeError] = useState("");

    const isEdit = Boolean(selectedDesignation);

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        if (selectedDesignation) {
            setFormData({
                designationName: selectedDesignation.designationName ?? "",
                serviceId: selectedDesignation.service?.id ?? "",
                serviceLevelId: selectedDesignation.serviceLevel?.id ?? "",
                allowedGrades: selectedDesignation.allowedGrades ?? [],
                salaryCode: selectedDesignation.salaryCode ?? ""
            });
        } else {
            setFormData(emptyForm);
        }
        setGradeError("");
    }, [selectedDesignation, open]);

    const loadDropdowns = async () => {
        const [serviceData, levelData] = await Promise.all([
            getServices(),
            getServiceLevels()
        ]);
        setServices(serviceData);
        setServiceLevels(levelData);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const toggleGrade = (grade) => {
        const exists = formData.allowedGrades.includes(grade);
        const allowedGrades = exists
            ? formData.allowedGrades.filter((g) => g !== grade)
            : [...formData.allowedGrades, grade];

        setFormData({ ...formData, allowedGrades });
        setGradeError("");
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const submitForm = () => {
        if (!formData.allowedGrades.length) {
            setGradeError("Select at least one allowed grade");
            return;
        }

        handleSubmit({
            designationName: formData.designationName.trim(),
            serviceId: Number(formData.serviceId),
            serviceLevelId: Number(formData.serviceLevelId),
            allowedGrades: formData.allowedGrades,
            salaryCode: formData.salaryCode?.trim() || null
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle>
                {isEdit ? "Edit Designation" : "Add Designation"}
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                >
                    Designation details
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Designation Name"
                            name="designationName"
                            value={formData.designationName}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...fieldProps}
                            label="Salary Code"
                            name="salaryCode"
                            value={formData.salaryCode}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service"
                            name="serviceId"
                            value={formData.serviceId}
                        >
                            {services.map((service) => (
                                <MenuItem
                                    key={service.id}
                                    value={service.id}
                                >
                                    {service.serviceCode} — {service.description}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service Level"
                            name="serviceLevelId"
                            value={formData.serviceLevelId}
                        >
                            {serviceLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.levelName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mt: 2.5, mb: 1 }}
                >
                    Allowed grades / classes
                </Typography>

                <FormGroup row>
                    {GRADES.map((grade) => (
                        <FormControlLabel
                            key={grade}
                            control={
                                <Checkbox
                                    checked={formData.allowedGrades.includes(grade)}
                                    onChange={() => toggleGrade(grade)}
                                />
                            }
                            label={grade}
                        />
                    ))}
                </FormGroup>

                {gradeError && (
                    <FormHelperText error sx={{ mt: 1 }}>
                        {gradeError}
                    </FormHelperText>
                )}

                {formData.serviceId && formData.serviceLevelId && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Employees assigned to this designation must match the
                        selected service level and one of the allowed grades.
                    </Alert>
                )}
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
