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
    Alert,
    Stack,
    Chip,
    Box
} from "@mui/material";
import { useEffect, useState } from "react";

import { getDesignations } from "../services/designationService";
import DesignationOptionContent from "./DesignationOptionContent";
import FormSection from "./FormSection";
import { renderDesignationSelectValue } from "../utils/designationDisplay";
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
    const [countError, setCountError] = useState("");

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
        setCountError("");
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
        if (e.target.name === "approvedCount") {
            setCountError("");
        }
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const selectedDesignation = designations.find(
        (d) => d.id === Number(formData.designationId)
    );

    const submitForm = () => {
        if (!formData.designationId) {
            return;
        }

        const count = Number(formData.approvedCount);
        if (formData.approvedCount === "" || Number.isNaN(count) || count < 0) {
            setCountError("Enter a valid approved count (0 or greater)");
            return;
        }

        handleSubmit({
            designationId: Number(formData.designationId),
            approvedCount: count
        });
    };

    const canSave =
        formData.designationId
        && formData.approvedCount !== ""
        && Number(formData.approvedCount) >= 0
        && !countError;

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
                    {isEdit ? "Edit Cadre Position" : "Add Cadre Position"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Link a designation to an approved headcount for cadre management.
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
                    title="Cadre Position"
                    description="Select the designation and set the approved staff count."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Designation"
                                name="designationId"
                                value={formData.designationId}
                                required
                                slotProps={{
                                    ...selectFieldProps.slotProps,
                                    select: {
                                        ...selectFieldProps.slotProps?.select,
                                        renderValue: (value) =>
                                            renderDesignationSelectValue(
                                                value,
                                                designations
                                            )
                                    }
                                }}
                            >
                                {designations.map((designation) => (
                                    <MenuItem
                                        key={designation.id}
                                        value={designation.id}
                                    >
                                        <DesignationOptionContent
                                            designation={designation}
                                        />
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {selectedDesignation && (
                            <Grid size={{ xs: 12 }}>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 1,
                                        bgcolor: "background.paper",
                                        border: "1px solid",
                                        borderColor: "divider"
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={600}
                                        display="block"
                                        sx={{ mb: 1 }}
                                    >
                                        Selected designation details
                                    </Typography>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        flexWrap="wrap"
                                        useFlexGap
                                    >
                                        <Chip
                                            size="small"
                                            label={
                                                selectedDesignation.service?.serviceCode
                                                ?? "No service"
                                            }
                                            variant="outlined"
                                        />
                                        <Chip
                                            size="small"
                                            label={
                                                selectedDesignation.serviceLevel?.levelName
                                                ?? "No service level"
                                            }
                                            variant="outlined"
                                        />
                                    </Stack>
                                    {selectedDesignation.service?.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mt: 1 }}
                                        >
                                            {selectedDesignation.service.description}
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Approved Count"
                                name="approvedCount"
                                type="number"
                                value={formData.approvedCount}
                                required
                                error={Boolean(countError)}
                                helperText={
                                    countError
                                    || "Number of approved positions for this designation"
                                }
                                slotProps={{ htmlInput: { min: 0 } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                Approved count is used in cadre vacancy and excess reports.
                                Each cadre position is tied to one designation.
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
                    {isEdit ? "Save Changes" : "Create Cadre Position"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
