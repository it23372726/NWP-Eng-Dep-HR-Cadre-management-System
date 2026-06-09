import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    Alert,
    Chip,
    Stack
} from "@mui/material";
import { useEffect, useState } from "react";
import { getDesignations } from "../../services/designationService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import { GRADES, validateDesignationAssignment } from "../../constants/hrms";

const today = () => new Date().toISOString().split("T")[0];

function buildValidationTarget(grade, serviceLevelId, serviceLevels) {
    return {
        grade,
        serviceLevel: serviceLevels.find(
            (l) => l.id === Number(serviceLevelId)
        )
    };
}

export default function PromotionDialog({
    open,
    onClose,
    onSubmit,
    employee
}) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [form, setForm] = useState({
        newDesignationId: "",
        grade: "",
        serviceLevelId: "",
        promotionDate: today(),
        remarks: ""
    });
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !employee) {
            return;
        }

        Promise.all([getDesignations(), getServiceLevels()]).then(
            ([designationData, levelData]) => {
                setDesignations(designationData);
                setServiceLevels(levelData);

                const initialForm = {
                    newDesignationId: String(employee.designation?.id ?? ""),
                    grade: employee.grade ?? "",
                    serviceLevelId: String(employee.serviceLevel?.id ?? ""),
                    promotionDate: today(),
                    remarks: ""
                };

                setForm(initialForm);

                const designation = designationData.find(
                    (d) => d.id === Number(initialForm.newDesignationId)
                );

                const validationError = validateDesignationAssignment(
                    buildValidationTarget(
                        initialForm.grade,
                        initialForm.serviceLevelId,
                        levelData
                    ),
                    designation
                );

                setError(validationError || "");
            }
        );
    }, [open, employee]);

    const selectedDesignation = designations.find(
        (d) => d.id === Number(form.newDesignationId)
    );

    const isPromotion =
        employee?.designation?.id
        && Number(form.newDesignationId) !== employee.designation.id;

    const runValidation = (nextForm) => {
        const designation = designations.find(
            (d) => d.id === Number(nextForm.newDesignationId)
        );

        const validationError = validateDesignationAssignment(
            buildValidationTarget(
                nextForm.grade,
                nextForm.serviceLevelId,
                serviceLevels
            ),
            designation
        );

        setError(validationError || "");
    };

    const handleChange = (e) => {
        const next = { ...form, [e.target.name]: e.target.value };
        setForm(next);

        if (
            ["newDesignationId", "grade", "serviceLevelId"].includes(
                e.target.name
            )
        ) {
            runValidation(next);
        }
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const submit = () => {
        const designation = designations.find(
            (d) => d.id === Number(form.newDesignationId)
        );

        const validationError = validateDesignationAssignment(
            buildValidationTarget(
                form.grade,
                form.serviceLevelId,
                serviceLevels
            ),
            designation
        );

        if (validationError) {
            setError(validationError);
            return;
        }

        onSubmit({
            newDesignationId: Number(form.newDesignationId),
            grade: form.grade,
            serviceLevelId: Number(form.serviceLevelId),
            promotionDate: form.promotionDate,
            remarks: form.remarks?.trim() || null
        });
    };

    const canSubmit =
        form.newDesignationId
        && form.grade
        && form.serviceLevelId
        && form.promotionDate
        && !error;

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
            <DialogTitle>
                {isPromotion
                    ? "Promote Employee"
                    : "Update Grade & Service Level"}
            </DialogTitle>

            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Change designation only when promoting to a new post.
                    Keep the same designation to update grade or service level
                    allowed for that post.
                </Alert>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Designation"
                            name="newDesignationId"
                            value={form.newDesignationId}
                        >
                            {designations.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.designationName}
                                    {d.id === employee?.designation?.id
                                        ? " (current)"
                                        : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Grade / Class"
                            name="grade"
                            value={form.grade}
                        >
                            {GRADES.map((g) => (
                                <MenuItem key={g} value={g}>
                                    {g}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service Level"
                            name="serviceLevelId"
                            value={form.serviceLevelId}
                        >
                            {serviceLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.levelName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label={
                                isPromotion
                                    ? "Promotion Date"
                                    : "Effective Date"
                            }
                            name="promotionDate"
                            value={form.promotionDate}
                        />
                    </Grid>

                    {isPromotion && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Remarks"
                                name="remarks"
                                value={form.remarks}
                                multiline
                                minRows={2}
                            />
                        </Grid>
                    )}
                </Grid>

                {selectedDesignation && (
                    <Stack
                        direction="row"
                        gap={1}
                        sx={{ mt: 2, flexWrap: "wrap" }}
                    >
                        <Chip
                            size="small"
                            label={`Required level: ${selectedDesignation.serviceLevel?.levelName}`}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`Allowed grades: ${(selectedDesignation.allowedGrades || []).join(", ")}`}
                            variant="outlined"
                        />
                    </Stack>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={submit}
                    disabled={!canSubmit}
                >
                    {isPromotion
                        ? "Confirm Promotion"
                        : "Update Assignment"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
