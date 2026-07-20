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
    Typography,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    FormControlLabel
} from "@mui/material";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updateEmployeeAction } from "../services/employeeLifecycleService";
import DesignationOptionContent from "./DesignationOptionContent";
import { getServiceLevels } from "../services/serviceLevelService";
import {
    GRADES,
    getActionTypeLabel,
    getApiErrorMessage,
    getPrimaryDepartmentName,
    isOtherDesignation,
    isPrimaryDepartment,
    OTHER_DESIGNATION_VALUE,
    validateCustomDesignationAssignment,
    validateDesignationAssignment
} from "../constants/hrms";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    parseDepartmentValue,
    resolveDepartmentValue
} from "./workplace/DepartmentOfficeFields";

const PROMOTION_OUTCOME = {
    STAYING: "staying",
    TRANSFERRING_OUT: "transferringOut"
};
import { createFormFieldProps, dialogActionsSx } from "../utils/formLayout";
import { renderDesignationSelectValue } from "../utils/designationDisplay";
import DateInput from "./DateInput";
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
        recordedDesignationName: "",
        specialDesignationName: "",
        grade: "",
        serviceLevelId: "",
        actionDate: "",
        remarks: "",
        promotionOutcome: PROMOTION_OUTCOME.STAYING,
        toDepartmentType: DEPARTMENT_OPTIONS.OTHER,
        toOtherDepartmentName: "",
        toOffice: "",
        toDistrict: ""
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

            const transferringOut = Boolean(
                isPrimaryDepartment(action.fromDepartment)
                && action.department
                && !isPrimaryDepartment(action.department)
            );
            const destination = transferringOut
                ? parseDepartmentValue(action.department)
                : parseDepartmentValue("");

            setForm({
                newDesignationId: action.recordedDesignationName
                    ? OTHER_DESIGNATION_VALUE
                    : String(action.newDesignationId || ""),
                recordedDesignationName: action.recordedDesignationName || "",
                specialDesignationName: action.recordedDesignationName
                    ? ""
                    : action.specialDesignationName || "",
                grade: action.newGrade || "",
                serviceLevelId: serviceLevelId ? String(serviceLevelId) : "",
                actionDate: action.actionDate || "",
                remarks: action.remarks || "",
                promotionOutcome: transferringOut
                    ? PROMOTION_OUTCOME.TRANSFERRING_OUT
                    : PROMOTION_OUTCOME.STAYING,
                toDepartmentType: destination.departmentType,
                toOtherDepartmentName: destination.otherDepartmentName,
                toOffice: transferringOut ? (action.office || "") : "",
                toDistrict: transferringOut ? (action.district || "") : ""
            });
        });
    }, [open, action, employee]);

    const inNwpDepartment = isPrimaryDepartment(employee?.currentDepartment);
    const transferringOut = form.promotionOutcome === PROMOTION_OUTCOME.TRANSFERRING_OUT;
    const showPromotionOutcome = isPromotion && inNwpDepartment;
    const toDepartment = resolveDepartmentValue(
        form.toDepartmentType,
        form.toOtherDepartmentName
    );
    const destinationIncomplete = transferringOut && (
        !toDepartment?.trim()
        || !form.toOffice?.trim()
    );
    const employeeService = employee?.designation?.service ?? employee?.service;
    const promotionDesignations = designations?.filter(
        (item) => item.service?.id === employeeService?.id
    ) ?? [];
    const isOtherPromotion = isOtherDesignation(form.newDesignationId);

    const designation = isOtherPromotion
        ? null
        : designations?.find((d) => d.id === Number(form.newDesignationId));
    const rulesSource = designation
        ?? (employeeService ? { service: employeeService } : null);

    const serviceMinimumEffectiveDate = isPromotionLike
        ? getMinimumPromotionEffectiveDate(
            employee,
            action?.oldGrade,
            action?.newGrade || form.grade,
            rulesSource
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
        const nextIsOther = isOtherDesignation(nextForm.newDesignationId);
        const nextDesignation = nextIsOther
            ? null
            : designations?.find(
                (d) => d.id === Number(nextForm.newDesignationId)
            );
        const nextRulesSource = nextDesignation
            ?? (employeeService ? { service: employeeService } : null);

        if (isPromotionLike) {
            const validationError = nextIsOther
                ? validateCustomDesignationAssignment({
                    grade: nextForm.grade,
                    serviceLevelId: nextForm.serviceLevelId,
                    service: employeeService
                })
                : validateDesignationAssignment(
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
                    nextRulesSource
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
        const { name, type, checked, value } = e.target;
        const next = {
            ...form,
            [name]: type === "checkbox" ? checked : value
        };

        if (name === "newDesignationId") {
            if (isOtherDesignation(value)) {
                next.recordedDesignationName = "";
                next.specialDesignationName = "";
            } else {
                next.recordedDesignationName = "";
                next.specialDesignationName = "";
            }
        }

        setForm(next);

        if (
            [
                "newDesignationId",
                "grade",
                "serviceLevelId",
                "actionDate",
                "promotionOutcome"
            ].includes(name)
        ) {
            runValidation(next);
        }
    };

    const { fieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isPromotionLike) {
                const validationError = isOtherPromotion
                    ? validateCustomDesignationAssignment({
                        grade: form.grade,
                        serviceLevelId: form.serviceLevelId,
                        service: employeeService
                    })
                    : validateDesignationAssignment(
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

                if (isOtherPromotion && !form.recordedDesignationName?.trim()) {
                    setError("Designation title is required for Other");
                    setLoading(false);
                    return;
                }

                const minDate = combineMinDates(
                    getMinimumPromotionEffectiveDate(
                        employee,
                        action?.oldGrade,
                        action?.newGrade || form.grade,
                        rulesSource
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
                remarks: form.remarks?.trim() || null
            };

            if (isPromotionLike) {
                if (isOtherPromotion) {
                    updateData.recordedDesignationName =
                        form.recordedDesignationName.trim();
                    updateData.newDesignationId = null;
                } else {
                    updateData.newDesignationId =
                        Number(form.newDesignationId) || null;
                    updateData.recordedDesignationName = null;
                    updateData.specialDesignationName =
                        form.specialDesignationName?.trim() || null;
                }
                updateData.grade = form.grade;
                updateData.serviceLevelId = Number(form.serviceLevelId) || null;
            }

            if (showPromotionOutcome) {
                updateData.transferringOut = transferringOut;
                if (transferringOut) {
                    if (destinationIncomplete) {
                        setError(
                            "Destination department and office are required when transferring out"
                        );
                        setLoading(false);
                        return;
                    }
                    updateData.toDepartment = toDepartment;
                    updateData.toOffice = form.toOffice.trim();
                    updateData.toDistrict = null;
                }
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
        && !actionDateTooEarly
        && (!showPromotionOutcome || !transferringOut || !destinationIncomplete);

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
                Edit {getActionTypeLabel(action) || "Lifecycle Action"}
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
                                slotProps={{
                                    ...selectFieldProps.slotProps,
                                    select: {
                                        ...selectFieldProps.slotProps?.select,
                                        renderValue: (value) =>
                                            renderDesignationSelectValue(
                                                value,
                                                promotionDesignations
                                            )
                                    }
                                }}
                            >
                                {promotionDesignations.map((d) => (
                                    <MenuItem key={d.id} value={d.id}>
                                        <DesignationOptionContent
                                            designation={d}
                                        />
                                    </MenuItem>
                                ))}
                                <MenuItem value={OTHER_DESIGNATION_VALUE}>
                                    Other (type historical title)
                                </MenuItem>
                            </TextField>
                        </Grid>
                    )}

                    {isPromotionLike && isOtherPromotion && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Designation title (as recorded)"
                                name="recordedDesignationName"
                                value={form.recordedDesignationName}
                            />
                        </Grid>
                    )}

                    {isPromotionLike && !isOtherPromotion && form.newDesignationId && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Special designation (optional)"
                                name="specialDesignationName"
                                value={form.specialDesignationName}
                                helperText="Shown on profile and history; reports use the designation above"
                            />
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

                    {showPromotionOutcome && (
                        <Grid size={{ xs: 12 }}>
                            <FormControl component="fieldset" required>
                                <FormLabel component="legend">
                                    Promotion outcome
                                </FormLabel>
                                <RadioGroup
                                    name="promotionOutcome"
                                    value={form.promotionOutcome}
                                    onChange={handleChange}
                                >
                                    <FormControlLabel
                                        value={PROMOTION_OUTCOME.STAYING}
                                        control={<Radio />}
                                        label={`Stays in ${getPrimaryDepartmentName()}`}
                                    />
                                    <FormControlLabel
                                        value={PROMOTION_OUTCOME.TRANSFERRING_OUT}
                                        control={<Radio />}
                                        label="Transfers out of department"
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Grid>
                    )}

                    {showPromotionOutcome && transferringOut && (
                        <DepartmentOfficeFields
                            departmentType={form.toDepartmentType}
                            otherDepartmentName={form.toOtherDepartmentName}
                            district={form.toDistrict}
                            office={form.toOffice}
                            departmentLabel="Destination department"
                            officeLabel="Destination office"
                            excludeNwpDepartment
                            onDepartmentTypeChange={(value) =>
                                setForm((prev) => ({
                                    ...prev,
                                    toDepartmentType: value,
                                    toDistrict: "",
                                    toOffice: ""
                                }))
                            }
                            onOtherDepartmentNameChange={(value) =>
                                setForm((prev) => ({
                                    ...prev,
                                    toOtherDepartmentName: value
                                }))
                            }
                            onDistrictChange={(value) =>
                                setForm((prev) => ({ ...prev, toDistrict: value }))
                            }
                            onOfficeChange={(value) =>
                                setForm((prev) => ({ ...prev, toOffice: value }))
                            }
                        />
                    )}

                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Effective Date"
                            name="actionDate"
                            value={form.actionDate}
                            required
                            slotProps={{
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

                        sx={{gap: 1,  mt: 2, flexWrap: "wrap" }}
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
