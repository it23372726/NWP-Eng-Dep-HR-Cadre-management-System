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
    Paper,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useState } from "react";
import { getDesignationsByService } from "../../services/designationService";
import { getServiceLevels } from "../../services/serviceLevelService";
import FormSection from "../FormSection";
import DesignationOptionContent from "../DesignationOptionContent";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import { renderDesignationSelectValue } from "../../utils/designationDisplay";
import DateInput from "../DateInput";
import {
    GRADES,
    getServiceRules,
    getPrimaryDepartmentName,
    isOtherDesignation,
    isPrimaryDepartment,
    OTHER_DESIGNATION_VALUE,
    REQUIREMENT_STATUS,
    resolveEmployeeDesignationName,
    serviceAllowsSpecial,
    serviceAllowsSupra,
    validateCustomDesignationAssignment,
    validateDesignationAssignment
} from "../../constants/hrms";
import {
    getGrade1AchievedDate,
    getGrade1EligibilityDate,
    getGrade2AchievedDate,
    getGrade2EligibilityDate,
    getGrade3AchievedDate,
    getSpecialEligibilityDate,
    getSupraEligibilityDate,
    normalizeRequiredYears
} from "../../utils/gradeAchievementDates";
import { combineMinDates, timelineMinDateHelperText } from "../../utils/timelineDates";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    resolveDepartmentValue
} from "../workplace/DepartmentOfficeFields";

const PROMOTION_OUTCOME = {
    STAYING: "staying",
    TRANSFERRING_OUT: "transferringOut"
};

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

function getTerminalPromotionGrade(serviceAllowedGrades = []) {
    if (serviceAllowedGrades.includes("Supra")) {
        return "Supra";
    }
    if (serviceAllowedGrades.includes("Special")) {
        return "Special";
    }
    return null;
}

function getSelectableGrades(
    currentGrade,
    designationAllowedGrades,
    serviceAllowedGrades
) {
    let designationGrades = designationAllowedGrades?.length
        ? designationAllowedGrades
        : GRADES.filter((grade) => grade !== "None");

    if (serviceAllowedGrades?.length) {
        designationGrades = designationGrades.filter((grade) =>
            serviceAllowedGrades.includes(grade)
        );
    }

    if (currentGrade === "I") {
        const terminalGrade = getTerminalPromotionGrade(serviceAllowedGrades);
        const progressionGrades = terminalGrade
            ? ["I", terminalGrade]
            : ["I"];
        return designationGrades.filter((grade) =>
            progressionGrades.includes(grade)
        );
    }

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
    employee,
    previousEventDate
}) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [form, setForm] = useState({
        newDesignationId: "",
        recordedDesignationName: "",
        specialDesignationName: "",
        grade: "",
        serviceLevelId: "",
        promotionDate: "",
        remarks: "",
        promotionOutcome: PROMOTION_OUTCOME.STAYING,
        toDepartmentType: DEPARTMENT_OPTIONS.OTHER,
        toOtherDepartmentName: "",
        toOffice: "",
        toDistrict: ""
    });
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !employee) {
            return;
        }

        const currentServiceId =
            employee.designation?.service?.id ?? employee.service?.id;
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

            const initialDesignationId = employee.recordedDesignationName
                ? OTHER_DESIGNATION_VALUE
                : String(employee.designation?.id ?? "");

            const initialForm = {
                newDesignationId: initialDesignationId,
                recordedDesignationName: employee.recordedDesignationName ?? "",
                specialDesignationName: employee.recordedDesignationName
                    ? ""
                    : employee.specialDesignationName ?? "",
                grade: employee.grade ?? "",
                serviceLevelId: String(employee.serviceLevel?.id ?? ""),
                promotionDate: "",
                remarks: "",
                promotionOutcome: PROMOTION_OUTCOME.STAYING,
                toDepartmentType: DEPARTMENT_OPTIONS.OTHER,
                toOtherDepartmentName: "",
                toOffice: "",
                toDistrict: ""
            };

            normalizeRequirements(
                designationData.find(
                    (designation) =>
                        designation.id === Number(initialForm.newDesignationId)
                )?.service?.grade2Requirements
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
                )?.service?.grade1Requirements
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

    const isOtherPromotion = isOtherDesignation(form.newDesignationId);
    const employeeService = employee?.designation?.service ?? employee?.service;
    const selectedDesignation = isOtherPromotion
        ? null
        : designations.find(
            (designation) => designation.id === Number(form.newDesignationId)
        );
    const rulesSource = selectedDesignation
        ?? (employeeService ? { service: employeeService } : null);
    const selectedServiceLevel = serviceLevels.find(
        (level) => level.id === Number(form.serviceLevelId)
    );

    const isPromotion = isOtherPromotion
        ? Boolean(form.recordedDesignationName?.trim())
            && form.recordedDesignationName.trim().toLowerCase()
                !== (employee?.recordedDesignationName || "").trim().toLowerCase()
        : employee?.designation?.id
            && Number(form.newDesignationId) !== employee.designation.id;
    const isGrade2Promotion =
        employee?.grade === "III" && form.grade === "II";
    const isGrade1Promotion =
        employee?.grade === "II" && form.grade === "I";
    const isSupraPromotion =
        employee?.grade === "I" && form.grade === "Supra";
    const isSpecialPromotion =
        employee?.grade === "I" && form.grade === "Special";
    const gradeChanged = employee?.grade !== form.grade;
    const serviceLevelChanged =
        employee?.serviceLevel?.id !== Number(form.serviceLevelId);
    const specialDesignationChanged = !isOtherPromotion
        && (form.specialDesignationName?.trim() || "").toLowerCase()
            !== (employee?.specialDesignationName || "").trim().toLowerCase();
    const hasAssignmentChange =
        isPromotion || gradeChanged || serviceLevelChanged || specialDesignationChanged;

    const selectableGrades = getSelectableGrades(
        employee?.grade,
        isOtherPromotion
            ? employeeService?.allowedGrades
            : selectedDesignation?.allowedGrades,
        getServiceRules(rulesSource)?.allowedGrades
    );

    const buildPromotionCandidate = (sourceForm, promotionType, designation) => {
        const rulesDesignation = designation ?? rulesSource;
        const configByType = {
            grade2: {
                filteredTypes: ["CUSTOM_GRADE_2_REQUIREMENT"],
                customType: "CUSTOM_GRADE_2_REQUIREMENT",
                customRequirements: getServiceRules(rulesDesignation)?.grade2Requirements
            },
            grade1: {
                filteredTypes: ["CUSTOM_GRADE_1_REQUIREMENT"],
                customType: "CUSTOM_GRADE_1_REQUIREMENT",
                customRequirements: getServiceRules(rulesDesignation)?.grade1Requirements
            },
            supra: {
                filteredTypes: ["CUSTOM_SUPRA_REQUIREMENT"],
                customType: "CUSTOM_SUPRA_REQUIREMENT",
                customRequirements: getServiceRules(rulesDesignation)?.supraRequirements
            },
            special: {
                filteredTypes: ["CUSTOM_SPECIAL_REQUIREMENT"],
                customType: "CUSTOM_SPECIAL_REQUIREMENT",
                customRequirements: getServiceRules(rulesDesignation)?.specialRequirements
            }
        };
        const config = configByType[promotionType];
        const {
            filteredTypes,
            customType,
            customRequirements
        } = config;

        return {
            ...employee,
            careerProgression: {
                ...(employee?.careerProgression || {}),
                grade2RequiredYears: getServiceRules(rulesDesignation)?.grade2RequiredYears,
                grade1RequiredYears: getServiceRules(rulesDesignation)?.grade1RequiredYears,
                supraRequiredYears: getServiceRules(rulesDesignation)?.supraRequiredYears,
                specialRequiredYears: getServiceRules(rulesDesignation)?.specialRequiredYears
            },
            requirements: [
                ...(employee?.requirements || []).filter(
                    (requirement) => !filteredTypes.includes(requirement.requirementType)
                ),
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
        rulesSource
    );
    const grade1Candidate = buildPromotionCandidate(
        form,
        "grade1",
        rulesSource
    );
    const supraCandidate = buildPromotionCandidate(
        form,
        "supra",
        rulesSource
    );
    const specialCandidate = buildPromotionCandidate(
        form,
        "special",
        rulesSource
    );
    const grade2EligibleDate = getGrade2EligibilityDate(
        grade2Candidate,
        rulesSource
    );
    const grade1EligibleDate = getGrade1EligibilityDate(
        grade1Candidate,
        rulesSource
    );
    const supraEligibleDate = getSupraEligibilityDate(
        supraCandidate,
        rulesSource
    );
    const specialEligibleDate = getSpecialEligibilityDate(
        specialCandidate,
        rulesSource
    );

    const serviceMinEffectiveDate = isGrade2Promotion
        ? grade2EligibleDate
        : isGrade1Promotion
            ? grade1EligibleDate
            : isSupraPromotion
                ? supraEligibleDate
                : isSpecialPromotion
                    ? specialEligibleDate
                    : null;
    const minEffectiveDate = combineMinDates(
        serviceMinEffectiveDate,
        previousEventDate
    );
    const effectiveDateTooEarly = Boolean(
        minEffectiveDate
        && form.promotionDate
        && form.promotionDate < minEffectiveDate
    );

    const grade2RequirementItems = [
        ...normalizeRequirements(getServiceRules(rulesSource)?.grade2Requirements).map(
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
            label: `${normalizeRequiredYears(getServiceRules(rulesSource)?.grade2RequiredYears)} year(s) service from first appointment`,
            editable: false,
            passed: servicePeriodMet(grade2EligibleDate, form.promotionDate)
        }
    ];

    const grade1RequirementItems = [
        ...normalizeRequirements(getServiceRules(rulesSource)?.grade1Requirements).map(
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
            label: `${normalizeRequiredYears(getServiceRules(rulesSource)?.grade1RequiredYears)} year(s) Grade II service period`,
            editable: false,
            passed: servicePeriodMet(grade1EligibleDate, form.promotionDate)
        }
    ];

    const supraRequirementItems = [
        ...normalizeRequirements(getServiceRules(rulesSource)?.supraRequirements).map(
            (requirement) => {
                const key = requirementKey(
                    "CUSTOM_SUPRA_REQUIREMENT",
                    requirement.requirementName
                );
                return {
                    key,
                    label: requirement.requirementName,
                    fieldName: key,
                    editable: true,
                    passed: isNamedRequirementCompleted(
                        supraCandidate,
                        "CUSTOM_SUPRA_REQUIREMENT",
                        requirement.requirementName
                    )
                };
            }
        ),
        {
            key: "supra-service",
            label: `${normalizeRequiredYears(getServiceRules(rulesSource)?.supraRequiredYears)} year(s) Grade I service period`,
            editable: false,
            passed: servicePeriodMet(supraEligibleDate, form.promotionDate)
        }
    ];

    const specialRequirementItems = [
        ...normalizeRequirements(getServiceRules(rulesSource)?.specialRequirements).map(
            (requirement) => {
                const key = requirementKey(
                    "CUSTOM_SPECIAL_REQUIREMENT",
                    requirement.requirementName
                );
                return {
                    key,
                    label: requirement.requirementName,
                    fieldName: key,
                    editable: true,
                    passed: isNamedRequirementCompleted(
                        specialCandidate,
                        "CUSTOM_SPECIAL_REQUIREMENT",
                        requirement.requirementName
                    )
                };
            }
        ),
        {
            key: "special-service",
            label: `${normalizeRequiredYears(getServiceRules(rulesSource)?.specialRequiredYears)} year(s) Grade I service period`,
            editable: false,
            passed: servicePeriodMet(specialEligibleDate, form.promotionDate)
        }
    ];

    const isGrade2PromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "grade2", designation);
        const eligibleDate = getGrade2EligibilityDate(candidate, designation);

        return normalizeRequirements(getServiceRules(designation)?.grade2Requirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_GRADE_2_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);
    };

    const isGrade1PromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "grade1", designation);
        const eligibleDate = getGrade1EligibilityDate(candidate, designation);

        return normalizeRequirements(getServiceRules(designation)?.grade1Requirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_GRADE_1_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);
    };

    const isSupraPromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "supra", designation);
        const eligibleDate = getSupraEligibilityDate(candidate, designation);

        return normalizeRequirements(getServiceRules(designation)?.supraRequirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_SUPRA_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);
    };

    const isSpecialPromotionQualified = (nextForm, designation) => {
        const candidate = buildPromotionCandidate(nextForm, "special", designation);
        const eligibleDate = getSpecialEligibilityDate(candidate, designation);

        return normalizeRequirements(getServiceRules(designation)?.specialRequirements).every(
                (requirement) => isNamedRequirementCompleted(
                    candidate,
                    "CUSTOM_SPECIAL_REQUIREMENT",
                    requirement.requirementName
                )
            )
            && servicePeriodMet(eligibleDate, nextForm.promotionDate);
    };

    const grade2Qualified = isGrade2PromotionQualified(form, rulesSource);
    const grade1Qualified = isGrade1PromotionQualified(form, rulesSource);
    const supraQualified = isSupraPromotionQualified(form, rulesSource);
    const specialQualified = isSpecialPromotionQualified(form, rulesSource);

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
        || (
            form.toDepartmentType === DEPARTMENT_OPTIONS.NWP
            && !form.toDistrict
        )
    );

    const runValidation = (nextForm) => {
        const nextIsOther = isOtherDesignation(nextForm.newDesignationId);
        const designation = nextIsOther
            ? null
            : designations.find(
                (item) => item.id === Number(nextForm.newDesignationId)
            );
        const nextRulesSource = designation
            ?? (employeeService ? { service: employeeService } : null);

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
                designation
            );

        if (validationError) {
            setError(validationError);
            return;
        }

        const minDate = combineMinDates(
            employee?.grade === "III" && nextForm.grade === "II"
                ? getGrade2EligibilityDate(
                    buildPromotionCandidate(nextForm, "grade2", nextRulesSource),
                    nextRulesSource
                )
                : employee?.grade === "II" && nextForm.grade === "I"
                    ? getGrade1EligibilityDate(
                        buildPromotionCandidate(nextForm, "grade1", nextRulesSource),
                        nextRulesSource
                    )
                    : employee?.grade === "I" && nextForm.grade === "Supra"
                        ? getSupraEligibilityDate(
                            buildPromotionCandidate(nextForm, "supra", nextRulesSource),
                            nextRulesSource
                        )
                        : employee?.grade === "I" && nextForm.grade === "Special"
                            ? getSpecialEligibilityDate(
                                buildPromotionCandidate(nextForm, "special", nextRulesSource),
                                nextRulesSource
                            )
                            : null,
            previousEventDate
        );

        if (
            minDate
            && nextForm.promotionDate
            && nextForm.promotionDate < minDate
        ) {
            setError(
                timelineMinDateHelperText(minDate, { tooEarly: true })
                || `Effective date cannot be earlier than ${formatDisplayDate(minDate)}.`
            );
            return;
        }

        if (
            employee?.grade === "III"
            && nextForm.grade === "II"
            && !isGrade2PromotionQualified(nextForm, nextRulesSource)
        ) {
            setError("Employee is not qualified for Grade II promotion");
            return;
        }

        if (
            employee?.grade === "II"
            && nextForm.grade === "I"
            && !isGrade1PromotionQualified(nextForm, nextRulesSource)
        ) {
            setError("Employee is not qualified for Grade I promotion");
            return;
        }

        if (
            employee?.grade === "I"
            && nextForm.grade === "Supra"
            && !isSupraPromotionQualified(nextForm, nextRulesSource)
        ) {
            setError("Employee is not qualified for Supra promotion");
            return;
        }

        if (
            employee?.grade === "I"
            && nextForm.grade === "Special"
            && !isSpecialPromotionQualified(nextForm, nextRulesSource)
        ) {
            setError("Employee is not qualified for Special promotion");
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
            if (isOtherDesignation(value)) {
                next.recordedDesignationName = "";
                next.specialDesignationName = "";
            } else {
                next.recordedDesignationName = "";
                next.specialDesignationName = "";
            }
            const designation = isOtherDesignation(value)
                ? null
                : designations.find((item) => item.id === Number(value));
            const nextRulesSource = designation
                ?? (employeeService ? { service: employeeService } : null);
            const nextSelectableGrades = getSelectableGrades(
                employee?.grade,
                isOtherDesignation(value)
                    ? employeeService?.allowedGrades
                    : designation?.allowedGrades,
                getServiceRules(nextRulesSource)?.allowedGrades
            );
            if (!nextSelectableGrades.includes(next.grade)) {
                next.grade = employee?.grade ?? nextSelectableGrades[0] ?? "";
            }
            normalizeRequirements(getServiceRules(nextRulesSource)?.grade2Requirements).forEach(
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
            normalizeRequirements(getServiceRules(nextRulesSource)?.grade1Requirements).forEach(
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
            normalizeRequirements(getServiceRules(nextRulesSource)?.supraRequirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_SUPRA_REQUIREMENT",
                        requirement.requirementName
                    );
                    next[key] = isNamedRequirementCompleted(
                        employee,
                        "CUSTOM_SUPRA_REQUIREMENT",
                        requirement.requirementName
                    );
                }
            );
            normalizeRequirements(getServiceRules(nextRulesSource)?.specialRequirements).forEach(
                (requirement) => {
                    const key = requirementKey(
                        "CUSTOM_SPECIAL_REQUIREMENT",
                        requirement.requirementName
                    );
                    next[key] = isNamedRequirementCompleted(
                        employee,
                        "CUSTOM_SPECIAL_REQUIREMENT",
                        requirement.requirementName
                    );
                }
            );
        }

        setForm(next);
        runValidation(next);
    };

    const { fieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const buildSubmittedRequirements = () => {
        const requirements = [];
        const serviceRules = getServiceRules(rulesSource);

        const appendConfigured = (type, definitions) => {
            normalizeRequirements(definitions).forEach((requirement) => {
                const key = requirementKey(type, requirement.requirementName);
                requirements.push({
                    requirementType: type,
                    requirementName: requirement.requirementName,
                    status: completedStatus(
                        form[key] ?? isNamedRequirementCompleted(
                            employee,
                            type,
                            requirement.requirementName
                        )
                    )
                });
            });
        };

        if (isGrade2Promotion) {
            appendConfigured(
                "CUSTOM_GRADE_2_REQUIREMENT",
                serviceRules?.grade2Requirements
            );
        }

        if (isGrade1Promotion) {
            appendConfigured(
                "CUSTOM_GRADE_1_REQUIREMENT",
                serviceRules?.grade1Requirements
            );
        }

        if (isSupraPromotion) {
            appendConfigured(
                "CUSTOM_SUPRA_REQUIREMENT",
                serviceRules?.supraRequirements
            );
        }

        if (isSpecialPromotion) {
            appendConfigured(
                "CUSTOM_SPECIAL_REQUIREMENT",
                serviceRules?.specialRequirements
            );
        }

        return requirements;
    };

    const submit = () => {
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
                selectedDesignation
            );

        if (validationError) {
            setError(validationError);
            return;
        }

        if (isOtherPromotion && !form.recordedDesignationName?.trim()) {
            setError("Designation title is required for Other");
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

        if (isSupraPromotion && !supraQualified) {
            setError("Employee is not qualified for Supra promotion");
            return;
        }

        if (isSpecialPromotion && !specialQualified) {
            setError("Employee is not qualified for Special promotion");
            return;
        }

        if (showPromotionOutcome && transferringOut && destinationIncomplete) {
            setError("Destination department and office are required when transferring out");
            return;
        }

        const payload = {
            ...(isOtherPromotion
                ? {
                    recordedDesignationName: form.recordedDesignationName.trim()
                }
                : {
                    newDesignationId: Number(form.newDesignationId),
                    specialDesignationName: form.specialDesignationName?.trim() || null
                }),
            grade: form.grade,
            serviceLevelId: Number(form.serviceLevelId),
            requirements: buildSubmittedRequirements(),
            grade2RequiredYears: null,
            promotionDate: form.promotionDate,
            remarks: form.remarks?.trim() || null
        };

        if (showPromotionOutcome && transferringOut) {
            payload.transferringOut = true;
            payload.toDepartment = toDepartment;
            payload.toOffice = form.toOffice.trim();
            payload.toDistrict = form.toDepartmentType === DEPARTMENT_OPTIONS.NWP
                ? form.toDistrict
                : null;
        }

        onSubmit(payload);
    };

    const canSubmit =
        form.newDesignationId
        && form.grade
        && form.serviceLevelId
        && form.promotionDate
        && (!isOtherPromotion || form.recordedDesignationName?.trim())
        && !error
        && !effectiveDateTooEarly
        && hasAssignmentChange
        && (!showPromotionOutcome || !transferringOut || !destinationIncomplete);

    const serviceLabel = employeeService
        ? `${employeeService.serviceCode} — ${employeeService.description}`
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
                                value={resolveEmployeeDesignationName(employee) || "—"}
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
                                slotProps={{
                                    ...selectFieldProps.slotProps,
                                    select: {
                                        ...selectFieldProps.slotProps?.select,
                                        renderValue: (value) =>
                                            renderDesignationSelectValue(
                                                value,
                                                designations,
                                                {
                                                    suffixFn: (designation) =>
                                                        designation.id
                                                            === employee?.designation?.id
                                                            ? " (current)"
                                                            : ""
                                                }
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
                                            suffix={
                                                designation.id
                                                    === employee?.designation?.id
                                                    ? " (current)"
                                                    : ""
                                            }
                                        />
                                    </MenuItem>
                                ))}
                                <MenuItem value={OTHER_DESIGNATION_VALUE}>
                                    Other (type historical title)
                                </MenuItem>
                            </TextField>
                        </Grid>

                        {isOtherPromotion && (
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    {...fieldProps}
                                    label="Designation title (as recorded)"
                                    name="recordedDesignationName"
                                    value={form.recordedDesignationName}
                                />
                            </Grid>
                        )}

                        {!isOtherPromotion && form.newDesignationId && (
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

                        {!inNwpDepartment && isPromotion && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="info">
                                    This promotion will be recorded but will not
                                    appear in the Cadre report because the employee
                                    is not in {getPrimaryDepartmentName()}.
                                </Alert>
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
                                <Alert
                                    severity="info"
                                    sx={{ mt: 1.5 }}
                                >
                                    {transferringOut
                                        ? "Cadre report: Promotion on the old designation only. The employee will not count as a New Appointment in this department."
                                        : "Cadre report: Promotion on the old designation and New Appointment on the new designation."}
                                </Alert>
                            </Grid>
                        )}

                        {showPromotionOutcome && transferringOut && (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Destination workplace
                                    </Typography>
                                </Grid>
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
                            </>
                        )}

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <DateInput
                                {...fieldProps}
                                label={
                                    isPromotion || gradeChanged
                                        ? "Effective Date"
                                        : "Update Effective Date"
                                }
                                name="promotionDate"
                                value={form.promotionDate}
                                required
                                slotProps={{
                                    htmlInput: minEffectiveDate
                                        ? { min: minEffectiveDate }
                                        : undefined
                                }}
                                error={effectiveDateTooEarly}
                                helperText={
                                    effectiveDateTooEarly
                                        ? timelineMinDateHelperText(
                                            minEffectiveDate,
                                            { tooEarly: true }
                                        )
                                        : minEffectiveDate
                                            ? `${timelineMinDateHelperText(minEffectiveDate)} Becomes the new present class / grade date.`
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
                            {getServiceRules(selectedDesignation)?.grade2RequiredYears != null && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Grade II service: ${getServiceRules(selectedDesignation).grade2RequiredYears} year(s)`}
                                />
                            )}
                            {getServiceRules(selectedDesignation)?.grade1RequiredYears != null && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Grade I service: ${getServiceRules(selectedDesignation).grade1RequiredYears} year(s)`}
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
                                    fromValue={resolveEmployeeDesignationName(employee)}
                                    toValue={
                                        isOtherPromotion
                                            ? form.recordedDesignationName
                                            : selectedDesignation?.designationName
                                    }
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

                {isSupraPromotion && (
                    <FormSection
                        title="Supra Promotion Requirements"
                        description="All listed requirements and the Grade I service period must be complete before promotion."
                    >
                        <Alert
                            severity={supraQualified ? "success" : "warning"}
                            sx={{ mb: 2 }}
                        >
                            Eligible from {formatDisplayDate(supraEligibleDate)}
                            {" · "}
                            {supraQualified
                                ? "Ready for Supra promotion"
                                : "Not yet qualified for Supra promotion"}
                        </Alert>

                        <RequirementChecklist
                            items={supraRequirementItems}
                            form={form}
                            employee={employee}
                            handleChange={handleChange}
                            editable
                        />
                    </FormSection>
                )}

                {isSpecialPromotion && (
                    <FormSection
                        title="Special Promotion Requirements"
                        description="All listed requirements and the Grade I service period must be complete before promotion."
                    >
                        <Alert
                            severity={specialQualified ? "success" : "warning"}
                            sx={{ mb: 2 }}
                        >
                            Eligible from {formatDisplayDate(specialEligibleDate)}
                            {" · "}
                            {specialQualified
                                ? "Ready for Special promotion"
                                : "Not yet qualified for Special promotion"}
                        </Alert>

                        <RequirementChecklist
                            items={specialRequirementItems}
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
