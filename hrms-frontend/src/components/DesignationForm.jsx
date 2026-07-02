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
    FormHelperText,
    Alert
} from "@mui/material";
import { useEffect, useState } from "react";

import { getServices } from "../services/serviceService";
import { getServiceLevels } from "../services/serviceLevelService";
import FormSection from "./FormSection";
import GradeSelector from "./GradeSelector";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";

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

    const selectedService = services.find(
        (service) => String(service.id) === String(formData.serviceId)
    );
    const serviceAllowedGrades = selectedService?.allowedGrades ?? [];

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "serviceId") {
            const nextService = services.find(
                (service) => String(service.id) === String(value)
            );
            const nextServiceGrades = nextService?.allowedGrades ?? [];
            const allowedGrades = formData.allowedGrades.filter((grade) =>
                nextServiceGrades.includes(grade)
            );

            setFormData({
                ...formData,
                serviceId: value,
                allowedGrades
            });
            setGradeError("");
            return;
        }

        setFormData({
            ...formData,
            [name]: value
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
            setGradeError("Select at least one eligible grade");
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

    const canSave =
        formData.designationName.trim()
        && formData.serviceId
        && formData.serviceLevelId
        && formData.allowedGrades.length > 0;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" component="span">
                    {isEdit ? "Edit Designation" : "Add Designation"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Configure designation identity and grade eligibility.
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
                    title="Basic Information"
                    description="Core designation identity and service classification."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Designation Name"
                                name="designationName"
                                value={formData.designationName}
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Salary Code"
                                name="salaryCode"
                                value={formData.salaryCode}
                                placeholder="Optional"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Service"
                                name="serviceId"
                                value={formData.serviceId}
                                required
                            >
                                {services.map((service) => (
                                    <MenuItem key={service.id} value={service.id}>
                                        {service.serviceCode} — {service.description}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Service Level"
                                name="serviceLevelId"
                                value={formData.serviceLevelId}
                                required
                            >
                                {serviceLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.levelName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    {formData.serviceId && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Qualification and promotion rules are configured on the
                            Service — all designations in this service share the same
                            rules. Employees must match the selected service level and
                            one of the eligible grades below.
                        </Alert>
                    )}
                </FormSection>

                <FormSection
                    title="Eligible Grades for This Designation"
                    description="Select which grade classes an employee must hold in the selected service to hold this designation."
                >
                    {!formData.serviceId && (
                        <FormHelperText sx={{ mb: 1 }}>
                            Select a service first to choose eligible grades.
                        </FormHelperText>
                    )}
                    {formData.serviceId && !serviceAllowedGrades.length && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            This service has no maximum achievable grades configured yet.
                            Configure them on the Service page before assigning grades here.
                        </Alert>
                    )}
                    <GradeSelector
                        selectedGrades={formData.allowedGrades}
                        onToggle={toggleGrade}
                        error={gradeError}
                        availableGrades={
                            formData.serviceId ? serviceAllowedGrades : []
                        }
                    />
                </FormSection>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={submitForm} disabled={!canSave}>
                    {isEdit ? "Save Changes" : "Create Designation"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
