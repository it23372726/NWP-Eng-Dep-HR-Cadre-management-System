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
    Checkbox,
    FormControlLabel,
    Typography,
    Box,
    Paper
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useState } from "react";
import { getDesignationsByService } from "../../services/designationService";
import { getServiceLevels } from "../../services/serviceLevelService";
import FormSection from "../FormSection";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import {
    GRADES,
    isRequirementCompleted,
    REQUIREMENT_STATUS,
    validateDesignationAssignment
} from "../../constants/hrms";
import {
    getGrade1EligibilityDate,
    getGrade2AchievedDate,
    getGrade2EligibilityDate,
    getGrade3AchievedDate
} from "../../utils/gradeAchievementDates";

const today = () => new Date().toISOString().split("T")[0];

const formatDisplayDate = (date) => {
    if (!date) return "—";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
};

const completedStatus = (checked) =>
    checked ? REQUIREMENT_STATUS.COMPLETED : REQUIREMENT_STATUS.PENDING;

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
    );

const requirementKey = (type, name) => `${type}:${name}`;

const servicePeriodMet = (eligibleDate, effectiveDate) =>
    Boolean(
        eligibleDate
        && effectiveDate
        && new Date(`${effectiveDate}T00:00:00`)
            >= new Date(`${eligibleDate}T00:00:00`)
    );

function InfoField({ label, value }) {
    return (
        <Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
            >
                {label}
            </Typography>
            <Typography variant="body2">{value ?? "—"}</Typography>
        </Box>
    );
}

function ChangePreview({ label, fromValue, toValue }) {
    const changed = fromValue !== toValue;

    return (
        <Paper
            variant="outlined"
            sx={{
                px: 2,
                py: 1.25,
                borderRadius: 2,
                bgcolor: changed ? "primary.50" : "grey.50"
            }}
        >
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2">{fromValue || "—"}</Typography>
                {changed && (
                    <>
                        <ArrowForwardIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={600}>
                            {toValue || "—"}
                        </Typography>
                    </>
                )}
            </Stack>
        </Paper>
    );
}

function RequirementChecklist({ items, form, employee, handleChange, editable }) {
    return (
        <Stack spacing={1}>
            {items.map((item) => {
                if (item.editable && editable) {
                    return (
                        <FormControlLabel
                            key={item.key}
                            control={
                                <Checkbox
                                    name={item.fieldName}
                                    checked={Boolean(form[item.fieldName])}
                                    onChange={handleChange}
                                />
                            }
                            label={item.label}
                        />
                    );
                }

                const passed = item.passed;
                return (
                    <Stack
                        key={item.key}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: "grey.50"
                        }}
                    >
                        <Typography variant="body2">{item.label}</Typography>
                        <Chip
                            size="small"
                            variant="outlined"
                            color={passed ? "success" : "warning"}
                            label={passed ? "Completed" : "Pending"}
                        />
                    </Stack>
                );
            })}
        </Stack>
    );
}

function buildValidationTarget(grade, serviceLevelId, serviceLevels) {
    return {
        grade,
        employmentType: "PERMANENT",
        serviceLevel: serviceLevels.find(
            (level) => level.id === Number(serviceLevelId)
        )
    };
}

const PROMOTION_GRADE_OPTIONS = {
    III: ["III", "II"],
    II: ["II", "I"],
    I: ["I"]
};

function getSelectableGrades(currentGrade, designationAllowedGrades) {
    const designationGrades = designationAllowedGrades?.length
        ? designationAllowedGrades
        : GRADES.filter((grade) => grade !== "None");

    const progressionGrades = PROMOTION_GRADE_OPTIONS[currentGrade];
    if (!progressionGrades) {
        return designationGrades.filter((grade) => grade === currentGrade);
    }

    return designationGrades.filter((grade) =>
        progressionGrades.includes(grade)
    );
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
        ebGrade2Passed: false,
        ebGrade1Passed: false,
        promotionDate: today(),
        remarks: ""
    });
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !employee) {
            return;
        }

        const currentServiceId = employee.designation?.service?.id;
        if (!currentServiceId) {
            setDesignations([]);
            setError("Current employee service is missing");
            return;
        }

        Promise.all([
            getDesignationsByService(currentServiceId),
            getServiceLevels()
        ]).then(([designationData, levelData]) => {
            setDesignations(designationData);
            setServiceLevels(levelData);

            const initialForm = {
                newDesignationId: String(employee.designation?.id ?? ""),
                grade: employee.grade ?? "",
                serviceLevelId: String(employee.serviceLevel?.id ?? ""),
                ebGrade2Passed: isRequirementCompleted(employee, "EB_GRADE_2"),
                ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1"),
                promotionDate: today(),
                remarks: ""
            };

            normalizeRequirements(
                designationData.find(
                    (designation) =>
                        designation.id === Number(initialForm.newDesignationId)
                )?.grade2Requirements
            ).forEach((requirement) => {
                initialForm[requirementKey(
                    "CUSTOM_GRADE_2_REQUIREMENT",
                    requirement.requirementName
                )] = isNamedRequirementCompleted(
                    employee,
                    "CUSTOM_GRADE_2_REQUIREMENT",
                    requirement.requirementName
                );
            });

            normalizeRequirements(
                designationData.find(
                    (designation) =>
                        designation.id === Number(initialForm.newDesignationId)
                )?.grade1Requirements
            ).forEach((requirement) => {
                initialForm[requirementKey(
                    "CUSTOM_GRADE_1_REQUIREMENT",
                    requirement.requirementName
                )] = isNamedRequirementCompleted(
                    employee,
                    "CUSTOM_GRADE_1_REQUIREMENT",
                    requirement.requirementName
                );
            });

            setForm(initialForm);

            const designation = designationData.find(
                (item) => item.id === Number(initialForm.newDesignationId)
            );

            setError(
                validateDesignationAssignment(
                    buildValidationTarget(
                        initialForm.grade,
                        initialForm.serviceLevelId,
                        levelData
                    ),
                    designation
                ) || ""
            );
        });
    }, [open, employee]);

    const selectedDesignation = designations.find(
        (designation) => designation.id === Number(form.newDesignationId)
    );
    const selectedServiceLevel = serviceLevels.find(
        (level) => level.id === Number(form.serviceLevelId)
    );

    const isPromotion =
        employee?.designation?.id
        && Number(form.newDesignationId) !== employee.designation.id;
    const isGrade2Promotion =
        employee?.grade === "III" && form.grade === "II";
    const isGrade1Promotion =
        employee?.grade === "II" && form.grade === "I";
    const gradeChanged = employee?.grade !== form.grade;
    const serviceLevelChanged =
        employee?.serviceLevel?.id !== Number(form.serviceLevelId);
    const hasAssignmentChange =
        isPromotion || gradeChanged || serviceLevelChanged;

    const selectableGrades = getSelectableGrades(
        employee?.grade,
        selectedDesignation?.allowedGrades
    );

    const buildPromotionCandidate = (sourceForm, promotionType, designation) => {
        const filteredTypes = promotionType === "grade2"
            ? ["EB_GRADE_2", "CUSTOM_GRADE_2_REQUIREMENT"]
            : ["EB_GRADE_1", "CUSTOM_GRADE_1_REQUIREMENT"];

        const customType = promotionType === "grade2"
            ? "CUSTOM_GRADE_2_REQUIREMENT"
            : "CUSTOM_GRADE_1_REQUIREMENT";
        const customRequirements = promotionType === "grade2"
            ? designation?.grade2Requirements
            : designation?.grade1Requirements;
        const fixedType = promotionType === "grade2" ? "EB_GRADE_2" : "EB_GRADE_1";
        const fixedField = promotionType === "grade2"
            ? "ebGrade2Passed"
            : "ebGrade1Passed";

        return {
            ...employee,
            careerProgression: {
                ...(employee?.careerProgression || {}),
                grade2RequiredYears: designation?.grade2RequiredYears,
                grade1RequiredYears: designation?.grade1RequiredYears
            },
            requirements: [
                ...(employee?.requirements || []).filter(
                    (requirement) => !filteredTypes.includes(requirement.requirementType)
                ),
                {
                    requirementType: fixedType,
                    status: completedStatus(sourceForm[fixedField])
                },
                ...normalizeRequirements(customRequirements).map((requirement) => ({
                    requirementType: customType,
                    requirementName: requirement.requirementName,
                    status: completedStatus(
                        sourceForm[requirementKey(customType, requirement.requirementName)]
                            ?? isNamedRequirementCompleted(
                                employee,
                                customType,
                                requirement.requirementName
                            )
                    )
                }))
            ]
        };
    };

    const grade2Candidate = buildPromotionCandidate(
        form,
        "grade2",
        selectedDesignation
    );
    const grade1Candidate = buildPromotionCandidate(
        form,
        "grade1",
        selectedDesignation
    );
    const grade2EligibleDate = getGrade2EligibilityDate(
        grade2Candidate,
        selectedDesignation
    );
    const grade1EligibleDate = getGrade1EligibilityDate(
        grade1Candidate,
        selectedDesignation
    );

    const minEffectiveDate = isGrade2Promotion
        ? grade2EligibleDate
        : isGrade1Promotion
            ? grade1EligibleDate
            : null;
    const effectiveDateTooEarly = Boolean(
        minEffectiveDate
        && form.promotionDate
        && form.promotionDate < minEffectiveDate
    );

    const grade2RequirementItems = [
        {
            key: "eb-grade-2",
            label: "EB Grade II Passed",
            fieldName: "ebGrade2Passed",
            editable: true,
            passed: isRequirementCompleted(grade2Candidate, "EB_GRADE_2")
        },
        ...normalizeRequirements(selectedDesignation?.grade2Requirements).map(
            (requirement) => {
                const key = requirementKey(
                    "CUSTOM_GRADE_2_REQUIREMENT",
                    requirement.requirementName
                );
                return {
                    key,
                    label: requirement.requirementName,
                    fieldName: key,
                    editable: true,
                    passed: isNamedRequirementCompleted(
                        grade2Candidate,
                        "CUSTOM_GRADE_2_REQUIREMENT",
                        requirement.requirementName
                    )
                };
            }
        ),
        {
            key: "grade2-service",
            label: selectedDesignation?.grade2RequiredYears != null
                ? `${selectedDesignation.grade2RequiredYears} year(s) service from first appointment`
                : "Required service period from first appointment",
            editable: false,
            passed: servicePeriodMet(grade2EligibleDate, form.promotionDate)
        }
    ];

    const grade1RequirementItems = [
        {
            key: "eb-grade-1",
            label: "EB Grade I Passed",
            fieldName: "ebGrade1Passed",
            editable: true,
            passed: isRequirementCompleted(grade1Candidate, "EB_GRADE_1")
        },
        ...normalizeRequirements(selectedDesignation?.grade1Requirements).map(
            (requirement) => {
                const key = requirementKey(
                    "CUSTOM_GRADE_1_REQUIREMENT",
                    requirement.requirementName
                );
                return {
                    key,
                    label: requirement.requirementName,
                    fieldName: key,
                    editable: true,
                    passed: isNamedRequirementCompleted(
                        grade1Candidate,
                        "CUSTOM_GRADE_1_REQUIREMENT",
                        requirement.requirementName
                    )
                };
            }
        ),
        {
            key: "grade1-service",
            label: selectedDesignation?.grade1RequiredYears != null
                ? `${selectedDesignation.grade1RequiredYears} year(s) Grade II service period`
                : "Required Grade II service period",
            editable: false,
            passed: servicePeriodMet(grade1EligibleDate, form.promotionDate)
        }
    ];

    const isGrade2PromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "grade2", designation);
        const eligibleDate = getGrade2EligibilityDate(candidate, designation);

        const requirementsMet =
            isRequirementCompleted(candidate, "EB_GRADE_2")
            && normalizeRequirements(designation?.grade2Requirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_GRADE_2_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);

        return requirementsMet;
    };

    const isGrade1PromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "grade1", designation);
        const eligibleDate = getGrade1EligibilityDate(candidate, designation);

        return isRequirementCompleted(candidate, "EB_GRADE_1")
            && normalizeRequirements(designation?.grade1Requirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_GRADE_1_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);
    };

    const grade2Qualified = isGrade2PromotionQualified(form, selectedDesignation);
    const grade1Qualified = isGrade1PromotionQualified(form, selectedDesignation);

    const runValidation = (nextForm) => {
        const designation = designations.find(
            (item) => item.id === Number(nextForm.newDesignationId)
        );

        const validationError = validateDesignationAssignment(
            buildValidationTarget(
                nextForm.grade,
                nextForm.serviceLevelId,
                serviceLevels
            ),
            designation
        );

        if (validationError) {
            setError(validationError);
            return;
        }

        const minDate = employee?.grade === "III" && nextForm.grade === "II"
            ? getGrade2EligibilityDate(
                buildPromotionCandidate(nextForm, "grade2", designation),
                designation
            )
            : employee?.grade === "II" && nextForm.grade === "I"
                ? getGrade1EligibilityDate(
                    buildPromotionCandidate(nextForm, "grade1", designation),
                    designation
                )
                : null;

        if (
            minDate
            && nextForm.promotionDate
            && nextForm.promotionDate < minDate
        ) {
            setError(
                `Effective date cannot be earlier than ${formatDisplayDate(minDate)}. `
                + "The required service period is not completed by the selected date."
            );
            return;
        }

        if (
            employee?.grade === "III"
            && nextForm.grade === "II"
            && !isGrade2PromotionQualified(nextForm, designation)
        ) {
            setError("Employee is not qualified for Grade II promotion");
            return;
        }

        if (
            employee?.grade === "II"
            && nextForm.grade === "I"
            && !isGrade1PromotionQualified(nextForm, designation)
        ) {
            setError("Employee is not qualified for Grade I promotion");
            return;
        }

        setError("");
    };

    const handleChange = (event) => {
        const { name, type, checked, value } = event.target;
        const next = {
            ...form,
            [name]: type === "checkbox" ? checked : value
        };

        if (name === "newDesignationId") {
            const designation = designations.find(
                (item) => item.id === Number(value)
            );
            const nextSelectableGrades = getSelectableGrades(
                employee?.grade,
                designation?.allowedGrades
            );
            if (!nextSelectableGrades.includes(next.grade)) {
                next.grade = employee?.grade ?? nextSelectableGrades[0] ?? "";
            }
            normalizeRequirements(designation?.grade2Requirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_GRADE_2_REQUIREMENT",
                        requirement.requirementName
                    );
                    next[key] = isNamedRequirementCompleted(
                        employee,
                        "CUSTOM_GRADE_2_REQUIREMENT",
                        requirement.requirementName
                    );
                }
            );
            normalizeRequirements(designation?.grade1Requirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_GRADE_1_REQUIREMENT",
                        requirement.requirementName
                    );
                    next[key] = isNamedRequirementCompleted(
                        employee,
                        "CUSTOM_GRADE_1_REQUIREMENT",
                        requirement.requirementName
                    );
                }
            );
        }

        setForm(next);
        runValidation(next);
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const buildSubmittedRequirements = () => {
        const requirements = [];

        if (isGrade2Promotion) {
            requirements.push({
                requirementType: "EB_GRADE_2",
                status: completedStatus(form.ebGrade2Passed)
            });
            normalizeRequirements(selectedDesignation?.grade2Requirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_GRADE_2_REQUIREMENT",
                        requirement.requirementName
                    );
                    requirements.push({
                        requirementType: "CUSTOM_GRADE_2_REQUIREMENT",
                        requirementName: requirement.requirementName,
                        status: completedStatus(
                            form[key] ?? isNamedRequirementCompleted(
                                employee,
                                "CUSTOM_GRADE_2_REQUIREMENT",
                                requirement.requirementName
                            )
                        )
                    });
                }
            );
        }

        if (isGrade1Promotion) {
            requirements.push({
                requirementType: "EB_GRADE_1",
                status: completedStatus(form.ebGrade1Passed)
            });
            normalizeRequirements(selectedDesignation?.grade1Requirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_GRADE_1_REQUIREMENT",
                        requirement.requirementName
                    );
                    requirements.push({
                        requirementType: "CUSTOM_GRADE_1_REQUIREMENT",
                        requirementName: requirement.requirementName,
                        status: completedStatus(
                            form[key] ?? isNamedRequirementCompleted(
                                employee,
                                "CUSTOM_GRADE_1_REQUIREMENT",
                                requirement.requirementName
                            )
                        )
                    });
                }
            );
        }

        return requirements;
    };

    const submit = () => {
        const designation = designations.find(
            (item) => item.id === Number(form.newDesignationId)
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

        if (isGrade2Promotion && !grade2Qualified) {
            setError("Employee is not qualified for Grade II promotion");
            return;
        }

        if (isGrade1Promotion && !grade1Qualified) {
            setError("Employee is not qualified for Grade I promotion");
            return;
        }

        onSubmit({
            newDesignationId: Number(form.newDesignationId),
            grade: form.grade,
            serviceLevelId: Number(form.serviceLevelId),
            requirements: buildSubmittedRequirements(),
            grade2RequiredYears: null,
            promotionDate: form.promotionDate,
            remarks: form.remarks?.trim() || null
        });
    };

    const canSubmit =
        form.newDesignationId
        && form.grade
        && form.serviceLevelId
        && form.promotionDate
        && !error
        && !effectiveDateTooEarly
        && hasAssignmentChange;

    const serviceLabel = employee?.designation?.service
        ? `${employee.designation.service.serviceCode} — ${employee.designation.service.description}`
        : "—";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {isPromotion ? "Promote Employee" : "Update Grade & Service Level"}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {employee?.fullName}
                    {" · "}
                    {employee?.employeeNo}
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
                    title="Current Assignment"
                    description="Existing post details before this change."
                >
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField label="Service" value={serviceLabel} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Designation"
                                value={employee?.designation?.designationName}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField label="Grade" value={employee?.grade} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Service Level"
                                value={employee?.serviceLevel?.levelName}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <InfoField
                                label="Present Class / Grade Date"
                                value={formatDisplayDate(
                                    employee?.appointmentDateToPresentClassGrade
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <InfoField
                                label="Grade III Achieved"
                                value={formatDisplayDate(
                                    getGrade3AchievedDate(employee)
                                )}
                            />
                        </Grid>
                        {getGrade2AchievedDate(employee) && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <InfoField
                                    label="Grade II Achieved"
                                    value={formatDisplayDate(
                                        getGrade2AchievedDate(employee)
                                    )}
                                />
                            </Grid>
                        )}
                    </Grid>
                </FormSection>

                <FormSection
                    title="New Assignment"
                    description={
                        isPromotion
                            ? "Select the new designation within the same service."
                            : "Keep the same designation to update grade or service level only."
                    }
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Designation"
                                name="newDesignationId"
                                value={form.newDesignationId}
                            >
                                {designations.map((designation) => (
                                    <MenuItem
                                        key={designation.id}
                                        value={designation.id}
                                    >
                                        {designation.designationName}
                                        {designation.id === employee?.designation?.id
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
                                {selectableGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>
                                        {grade}
                                        {grade === employee?.grade
                                            ? " (current)"
                                            : ""}
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

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...dateFieldProps}
                                label={
                                    isPromotion || gradeChanged
                                        ? "Effective Date"
                                        : "Update Effective Date"
                                }
                                name="promotionDate"
                                value={form.promotionDate}
                                slotProps={{
                                    ...dateFieldProps.slotProps,
                                    htmlInput: minEffectiveDate
                                        ? { min: minEffectiveDate }
                                        : undefined
                                }}
                                error={effectiveDateTooEarly}
                                helperText={
                                    effectiveDateTooEarly
                                        ? `Cannot be earlier than ${formatDisplayDate(minEffectiveDate)} (required service period not completed).`
                                        : minEffectiveDate
                                            ? `Earliest allowed date: ${formatDisplayDate(minEffectiveDate)}. Becomes the new present class / grade date.`
                                            : gradeChanged
                                                ? "Becomes the new present class / grade date."
                                                : "Date this assignment change takes effect."
                                }
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                {...fieldProps}
                                label="Remarks"
                                name="remarks"
                                value={form.remarks}
                                placeholder="Optional note for the lifecycle record"
                            />
                        </Grid>
                    </Grid>

                    {selectedDesignation && (
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            sx={{ mt: 2, gap: 1 }}
                        >
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Required level: ${selectedDesignation.serviceLevel?.levelName || "—"}`}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Selectable grades: ${selectableGrades.join(", ") || "—"}`}
                            />
                            {selectedDesignation.grade2RequiredYears != null && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Grade II service: ${selectedDesignation.grade2RequiredYears} year(s)`}
                                />
                            )}
                            {selectedDesignation.grade1RequiredYears != null && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Grade I service: ${selectedDesignation.grade1RequiredYears} year(s)`}
                                />
                            )}
                        </Stack>
                    )}
                </FormSection>

                {hasAssignmentChange && (
                    <FormSection
                        title="Change Summary"
                        description="Review what will be updated before saving."
                    >
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <ChangePreview
                                    label="Designation"
                                    fromValue={employee?.designation?.designationName}
                                    toValue={selectedDesignation?.designationName}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <ChangePreview
                                    label="Grade"
                                    fromValue={employee?.grade}
                                    toValue={form.grade}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <ChangePreview
                                    label="Service Level"
                                    fromValue={employee?.serviceLevel?.levelName}
                                    toValue={selectedServiceLevel?.levelName}
                                />
                            </Grid>
                        </Grid>
                    </FormSection>
                )}

                {isGrade2Promotion && (
                    <FormSection
                        title="Grade II Promotion Requirements"
                        description="All listed requirements and the service period must be complete before promotion."
                    >
                        <Alert
                            severity={grade2Qualified ? "success" : "warning"}
                            sx={{ mb: 2 }}
                        >
                            Eligible from {formatDisplayDate(grade2EligibleDate)}
                            {" · "}
                            {grade2Qualified
                                ? "Ready for Grade II promotion"
                                : "Not yet qualified for Grade II promotion"}
                        </Alert>

                        <RequirementChecklist
                            items={grade2RequirementItems}
                            form={form}
                            employee={employee}
                            handleChange={handleChange}
                            editable
                        />
                    </FormSection>
                )}

                {isGrade1Promotion && (
                    <FormSection
                        title="Grade I Promotion Requirements"
                        description="All listed requirements and the Grade II service period must be complete before promotion."
                    >
                        <Alert
                            severity={grade1Qualified ? "success" : "warning"}
                            sx={{ mb: 2 }}
                        >
                            Eligible from {formatDisplayDate(grade1EligibleDate)}
                            {" · "}
                            {grade1Qualified
                                ? "Ready for Grade I promotion"
                                : "Not yet qualified for Grade I promotion"}
                        </Alert>

                        <RequirementChecklist
                            items={grade1RequirementItems}
                            form={form}
                            employee={employee}
                            handleChange={handleChange}
                            editable
                        />
                    </FormSection>
                )}

                {!hasAssignmentChange && (
                    <Alert severity="info">
                        Change the designation, grade, or service level to update
                        this employee&apos;s assignment.
                    </Alert>
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
