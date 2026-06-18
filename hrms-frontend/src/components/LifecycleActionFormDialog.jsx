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
    Stack,
    Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updateEmployeeAction } from "../services/employeeLifecycleService";
import { getServiceLevels } from "../services/serviceLevelService";
import {
    ACTION_TYPE_LABELS,
    GRADES,
    getApiErrorMessage,
    validateDesignationAssignment
} from "../constants/hrms";
import { createFormFieldProps, dialogActionsSx } from "../utils/formLayout";
import { getMinimumPromotionEffectiveDate } from "../utils/gradeAchievementDates";
import {
    combineMinDates,
    getPreviousEventDateForEdit,
    timelineMinDateHelperText
} from "../utils/timelineDates";

const formatDisplayDate = (date) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB") : "—";

function buildValidationTarget(grade, serviceLevelId, serviceLevels) {
    return {
        grade,
        serviceLevel: serviceLevels.find(
            (l) => l.id === Number(serviceLevelId)
        )
    };
}

export default function LifecycleActionFormDialog({
    open,
    onClose,
    action,
    employee,
    designations,
    actionHistory,
    onSuccess
}) {
    const [serviceLevels, setServiceLevels] = useState([]);
    const [form, setForm] = useState({
        newDesignationId: "",
        grade: "",
        serviceLevelId: "",
        actionDate: "",
        remarks: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const isPromotion = action?.actionType === "PROMOTION";
    const isAssignmentGradeUpdate =
        action?.actionType === "ASSIGNMENT_GRADE_UPDATE";
    const isPromotionLike = isPromotion || isAssignmentGradeUpdate;

    useEffect(() => {
        if (!open || !action) {
            return;
        }

        getServiceLevels().then((levelData) => {
            setServiceLevels(levelData);

            const serviceLevelId = action.serviceLevelId
                ?? (action.canModify ? employee?.serviceLevel?.id : null);

            setForm({
                newDesignationId: String(action.newDesignationId || ""),
                grade: action.newGrade || "",
                serviceLevelId: serviceLevelId ? String(serviceLevelId) : "",
                actionDate: action.actionDate || "",
                remarks: action.remarks || ""
            });
        });
    }, [open, action, employee]);

    const designation = designations?.find(
        (d) => d.id === Number(form.newDesignationId)
    );

    const serviceMinimumEffectiveDate = isPromotionLike
        ? getMinimumPromotionEffectiveDate(
            employee,
            action?.oldGrade,
            action?.newGrade || form.grade,
            designation || employee?.designation
        )
        : null;
    const previousEventDate = getPreviousEventDateForEdit(actionHistory, action?.id);
    const minimumEffectiveDate = combineMinDates(
        serviceMinimumEffectiveDate,
        previousEventDate
    );
    const actionDateTooEarly = Boolean(
        minimumEffectiveDate
        && form.actionDate
        && form.actionDate < minimumEffectiveDate
    );

    const runValidation = (nextForm) => {
        if (isPromotionLike) {
            const nextDesignation = designations?.find(
                (d) => d.id === Number(nextForm.newDesignationId)
            );

            const validationError = validateDesignationAssignment(
                buildValidationTarget(
                    nextForm.grade,
                    nextForm.serviceLevelId,
                    serviceLevels
                ),
                nextDesignation
            );

            if (validationError) {
                setError(validationError);
                return;
            }
        }

        const minDate = combineMinDates(
            isPromotionLike
                ? getMinimumPromotionEffectiveDate(
                    employee,
                    action?.oldGrade,
                    action?.newGrade || nextForm.grade,
                    designations?.find(
                        (d) => d.id === Number(nextForm.newDesignationId)
                    ) || employee?.designation
                )
                : null,
            previousEventDate
        );

        if (minDate && nextForm.actionDate && nextForm.actionDate < minDate) {
            setError(
                timelineMinDateHelperText(minDate, { tooEarly: true })
                || `Effective date cannot be earlier than ${formatDisplayDate(minDate)}.`
            );
            return;
        }

        setError("");
    };

    const handleChange = (e) => {
        const next = { ...form, [e.target.name]: e.target.value };
        setForm(next);

        if (
            [
                "newDesignationId",
                "grade",
                "serviceLevelId",
                "actionDate"
            ].includes(e.target.name)
        ) {
            runValidation(next);
        }
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isPromotionLike) {
                const designation = designations?.find(
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
                    setLoading(false);
                    return;
                }

                const minDate = combineMinDates(
                    getMinimumPromotionEffectiveDate(
                        employee,
                        action?.oldGrade,
                        action?.newGrade || form.grade,
                        designation || employee?.designation
                    ),
                    previousEventDate
                );

                if (minDate && form.actionDate < minDate) {
                    setError(
                        timelineMinDateHelperText(minDate, { tooEarly: true })
                        || `Effective date cannot be earlier than ${formatDisplayDate(minDate)}.`
                    );
                    setLoading(false);
                    return;
                }
            } else if (
                previousEventDate
                && form.actionDate
                && form.actionDate < previousEventDate
            ) {
                setError(
                    timelineMinDateHelperText(previousEventDate, { tooEarly: true })
                );
                setLoading(false);
                return;
            }

            const updateData = {
                actionDate: form.actionDate,
                newDesignationId: Number(form.newDesignationId) || null,
                remarks: form.remarks?.trim() || null
            };

            if (isPromotionLike) {
                updateData.grade = form.grade;
                updateData.serviceLevelId = Number(form.serviceLevelId) || null;
            }

            await updateEmployeeAction(action.id, updateData);
            toast.success("Lifecycle action updated successfully");
            onSuccess();
            onClose();
        } catch (submitError) {
            toast.error(getApiErrorMessage(submitError));
        } finally {
            setLoading(false);
        }
    };

    const canSubmit =
        form.actionDate
        && !error
        && !actionDateTooEarly;

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
                Edit {ACTION_TYPE_LABELS[action?.actionType] || "Lifecycle Action"}
            </DialogTitle>

            <DialogContent dividers>
                {isPromotionLike && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        From: {action?.oldDesignationName || "—"}
                        {action?.oldGrade ? ` · Grade ${action.oldGrade}` : ""}
                    </Typography>
                )}

                <Grid container spacing={2}>
                    {isPromotionLike && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...selectFieldProps}
                                label="To Designation"
                                name="newDesignationId"
                                value={form.newDesignationId}
                            >
                                {designations?.map((d) => (
                                    <MenuItem key={d.id} value={d.id}>
                                        {d.designationName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}

                    {isPromotionLike && (
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
                    )}

                    {isPromotionLike && (
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
                    )}

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Effective Date"
                            name="actionDate"
                            value={form.actionDate}
                            required
                            slotProps={{
                                ...dateFieldProps.slotProps,
                                htmlInput: {
                                    min: minimumEffectiveDate || undefined
                                }
                            }}
                            error={actionDateTooEarly}
                            helperText={
                                actionDateTooEarly
                                    ? timelineMinDateHelperText(
                                        minimumEffectiveDate,
                                        { tooEarly: true }
                                    )
                                    : timelineMinDateHelperText(minimumEffectiveDate)
                            }
                        />
                    </Grid>

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
                </Grid>

                    {isPromotionLike && designation && (
                    <Stack
                        direction="row"
                        gap={1}
                        sx={{ mt: 2, flexWrap: "wrap" }}
                    >
                        <Chip
                            size="small"
                            label={`Required level: ${designation.serviceLevel?.levelName}`}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`Allowed grades: ${(designation.allowedGrades || []).join(", ")}`}
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
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                >
                    {loading ? "Saving..." : "Save Changes"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
