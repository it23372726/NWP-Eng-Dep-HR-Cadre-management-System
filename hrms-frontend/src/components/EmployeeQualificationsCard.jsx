import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import {
    FIXED_TRAINING_GRADUATION_REQUIREMENTS,
    getEmployeeServiceRules,
    getTrainingGraduationBlockReason,
    getTrainingPeriodEndDate,
    getTrainingPeriodYears,
    isTrainingEmployee,
    isTrainingGraduationEligible,
    resolveEmployeeDesignationName,
    resolveEmployeeService,
    serviceAllowsSpecial,
    serviceAllowsSupra
} from "../constants/hrms";
import {
    getGrade1AchievedDate,
    getGrade2AchievedDate,
    getGrade1EligibilityDate,
    getGrade2EligibilityDate,
    getGrade3AchievedDate,
    getSpecialEligibilityDate,
    getSupraEligibilityDate,
    normalizeRequiredYears
} from "../utils/gradeAchievementDates";

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "—";

const isDateReached = (date) => {
    if (!date) {
        return false;
    }

    return new Date() >= new Date(`${date}T00:00:00`);
};

const getThreeYearServiceDate = (dateOfFirstAppointment) => {
    if (!dateOfFirstAppointment) {
        return null;
    }

    const date = new Date(`${dateOfFirstAppointment}T00:00:00`);
    date.setFullYear(date.getFullYear() + 3);
    return date.toISOString().split("T")[0];
};

const appendServicePeriodRow = (rows, label, eligibilityDate) => {
    if (!eligibilityDate) {
        return rows;
    }

    const met = isDateReached(eligibilityDate);
    return [
        ...rows,
        {
            key: `service-period:${label}`,
            label,
            status: met ? "COMPLETED" : "PENDING",
            completedDate: met ? eligibilityDate : null,
            remarks: `Eligible from ${formatDate(eligibilityDate)}`
        }
    ];
};

const statusMeta = (status) => {
    if (status === "COMPLETED") {
        return { label: "Completed", color: "success" };
    }
    if (status === "REJECTED") {
        return { label: "Rejected", color: "error" };
    }
    return { label: "Pending", color: "warning" };
};

const findRequirement = (employee, type, name = null) =>
    (employee?.requirements || []).find((requirement) => {
        if (requirement.requirementType !== type) {
            return false;
        }
        if (!name) {
            return !requirement.requirementName
                || requirement.requirementName.trim() === "";
        }
        return (requirement.requirementName || "").toLowerCase()
            === name.toLowerCase();
    });

const toRow = (label, type, name, employee) => {
    const record = findRequirement(employee, type, name);
    return {
        key: name ? `${type}:${name}` : type,
        label,
        status: record?.status || "PENDING",
        completedDate: record?.completedDate,
        remarks: record?.remarks
    };
};

const buildFixedRows = (definitions, employee) =>
    definitions.map(({ requirementType, label }) =>
        toRow(label, requirementType, null, employee)
    );

const normalizeRequirements = (requirements) => {
    if (!requirements) {
        return [];
    }
    if (Array.isArray(requirements)) {
        return requirements;
    }
    return Object.values(requirements);
};

const buildCustomRows = (type, definitions, employee) =>
    normalizeRequirements(definitions).map((definition) =>
        toRow(
            definition.requirementName,
            type,
            definition.requirementName,
            employee
        )
    );

const sectionProgress = (rows) => {
    if (!rows.length) {
        return { completed: 0, total: 0, percent: 0 };
    }
    const completed = rows.filter((row) => row.status === "COMPLETED").length;
    return {
        completed,
        total: rows.length,
        percent: Math.round((completed / rows.length) * 100)
    };
};

function RequirementSection({
    title,
    description,
    meta,
    rows,
    eligibilityDate,
    promotionReadyLabel
}) {
    if (!rows.length) {
        return null;
    }

    const progress = sectionProgress(rows);
    const serviceDateMet = !eligibilityDate || isDateReached(eligibilityDate);
    const requirementsComplete = progress.percent === 100;
    const fullyEligible = requirementsComplete && serviceDateMet;

    const statusChipLabel = fullyEligible
        ? promotionReadyLabel || "Eligible"
        : requirementsComplete && !serviceDateMet
            ? "Awaiting service date"
            : `${progress.completed} / ${progress.total} completed`;

    const statusChipColor = fullyEligible
        ? "success"
        : requirementsComplete && !serviceDateMet
            ? "warning"
            : "default";

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "background.paper"
            }}
        >
            <Box sx={{ px: 2.5, py: 2, bgcolor: "grey.50" }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                >
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {title}
                        </Typography>
                        {description && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                            >
                                {description}
                            </Typography>
                        )}
                        {meta && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 0.75, display: "block" }}
                            >
                                {meta}
                            </Typography>
                        )}
                    </Box>
                    <Stack spacing={0.75} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                        <Chip
                            size="small"
                            variant="outlined"
                            label={statusChipLabel}
                            color={statusChipColor}
                        />
                        {eligibilityDate && (
                            <Typography variant="caption" color="text.secondary">
                                Required date: {formatDate(eligibilityDate)}
                            </Typography>
                        )}
                    </Stack>
                </Stack>
                <LinearProgress
                    variant="determinate"
                    value={progress.percent}
                    color={fullyEligible ? "success" : "primary"}
                    sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
                />
                {eligibilityDate && (
                    <Alert
                        severity={fullyEligible ? "success" : "info"}
                        sx={{ mt: 1.5, py: 0.25 }}
                    >
                        {fullyEligible
                            ? `Service period met. Eligible from ${formatDate(eligibilityDate)}.`
                            : requirementsComplete
                                ? `All listed requirements are complete, but promotion is only possible from ${formatDate(eligibilityDate)}.`
                                : `Promotion also requires the service period to be completed by ${formatDate(eligibilityDate)}.`}
                    </Alert>
                )}
            </Box>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                            <TableCell sx={{ fontWeight: 600, width: "45%" }}>
                                Requirement
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, width: "20%" }}>
                                Status
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, width: "20%" }}>
                                Completed On
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, width: "15%" }}>
                                Remarks
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const metaItem = statusMeta(row.status);
                            return (
                                <TableRow key={row.key} hover>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {row.label}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={metaItem.label}
                                            color={metaItem.color}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(row.completedDate)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {row.remarks || "—"}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

function QualificationsSummary({
    employee,
    overall,
    allSectionsEligible,
    onUpdateQualifications,
    qualificationsActionLabel = "Update Qualifications"
}) {
    const designationName =
        resolveEmployeeDesignationName(employee)?.trim() || "Unassigned designation";
    const service = resolveEmployeeService(employee);
    const serviceLabel = service
        ? `${service.serviceCode} — ${service.description}`
        : null;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: 2,
                bgcolor: "grey.50"
            }}
        >
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2.5}
                sx={{
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", md: "center" }
                }}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ lineHeight: 1.2 }}
                    >
                        Service requirements
                    </Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ mt: 0.25 }}>
                        {designationName}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75 }}
                    >
                        Tracks permanent confirmation, Grade II promotion, and Grade I
                        promotion requirements for this employee.
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        sx={{ mt: 1.25, gap: 1, alignItems: "center" }}
                    >
                        {employee.grade && (
                            <Chip
                                size="small"
                                label={`Grade ${employee.grade}`}
                                variant="outlined"
                            />
                        )}
                        {serviceLabel && (
                            <Chip
                                size="small"
                                label={serviceLabel}
                                variant="outlined"
                            />
                        )}
                        {onUpdateQualifications && (
                            <Button
                                size="small"
                                variant="contained"
                                onClick={onUpdateQualifications}
                                sx={{ ml: { sm: "auto" } }}
                            >
                                {qualificationsActionLabel}
                            </Button>
                        )}
                    </Stack>
                </Box>

                <Paper
                    variant="outlined"
                    sx={{
                        px: 2,
                        py: 1.5,
                        minWidth: { xs: "100%", md: 200 },
                        maxWidth: { md: 220 },
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        flexShrink: 0
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Overall completion
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                        {overall.percent}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {overall.completed} of {overall.total} items
                    </Typography>
                    <Chip
                        size="small"
                        sx={{ mt: 1 }}
                        variant="outlined"
                        color={allSectionsEligible ? "success" : "warning"}
                        label={
                            allSectionsEligible
                                ? "Fully eligible"
                                : overall.percent === 100
                                    ? "Awaiting required date(s)"
                                    : "In progress"
                        }
                    />
                </Paper>
            </Stack>
        </Paper>
    );
}

export default function EmployeeQualificationsCard({
    employee,
    embedded = false,
    onUpdateQualifications = null,
    qualificationsActionLabel = "Update Qualifications"
}) {
    if (!employee) {
        return null;
    }

    const service = getEmployeeServiceRules(employee);
    const careerProgression = employee.careerProgression || {};
    const grade = employee.grade;
    const isPermanent = employee.employmentType === "PERMANENT";
    const hasConfirmedPermanent = Boolean(
        careerProgression.permanentConfirmationDate
    );
    const grade2RequiredYears = normalizeRequiredYears(
        service?.grade2RequiredYears ?? careerProgression.grade2RequiredYears
    );
    const grade1RequiredYears = normalizeRequiredYears(
        service?.grade1RequiredYears ?? careerProgression.grade1RequiredYears
    );
    const supraRequiredYears = normalizeRequiredYears(
        service?.supraRequiredYears ?? careerProgression.supraRequiredYears
    );
    const specialRequiredYears = normalizeRequiredYears(
        service?.specialRequiredYears ?? careerProgression.specialRequiredYears
    );

    const threeYearServiceDate = getThreeYearServiceDate(
        employee.dateOfFirstAppointment
    );
    const permanentQualificationDate =
        careerProgression.permanentQualificationDate || threeYearServiceDate;

    const permanentRows = appendServicePeriodRow(
        buildCustomRows(
            "CUSTOM_PERMANENT_REQUIREMENT",
            service?.permanentRequirements,
            employee
        ),
        "3 Years Government Service Completed",
        threeYearServiceDate
    );

    const grade2Rows = appendServicePeriodRow(
        buildCustomRows(
            "CUSTOM_GRADE_2_REQUIREMENT",
            service?.grade2Requirements,
            employee
        ),
        `${grade2RequiredYears} Year(s) Service From First Appointment`,
        careerProgression.grade2EligibilityDate
            ?? getGrade2EligibilityDate(employee, { service }),
    );

    const grade1Rows = appendServicePeriodRow(
        buildCustomRows(
            "CUSTOM_GRADE_1_REQUIREMENT",
            service?.grade1Requirements,
            employee
        ),
        `${grade1RequiredYears} Year(s) Grade II Service Period`,
        careerProgression.grade1EligibilityDate
            ?? getGrade1EligibilityDate(employee, { service }),
    );

    const supraRows = appendServicePeriodRow(
        buildCustomRows(
            "CUSTOM_SUPRA_REQUIREMENT",
            service?.supraRequirements,
            employee
        ),
        `${supraRequiredYears} Year(s) Grade I Service Period`,
        careerProgression.supraEligibilityDate
            ?? getSupraEligibilityDate(employee, { service })
    );

    const specialRows = appendServicePeriodRow(
        buildCustomRows(
            "CUSTOM_SPECIAL_REQUIREMENT",
            service?.specialRequirements,
            employee
        ),
        `${specialRequiredYears} Year(s) Grade I Service Period`,
        careerProgression.specialEligibilityDate
            ?? getSpecialEligibilityDate(employee, { service })
    );

    const trainingRows = appendServicePeriodRow(
        buildFixedRows(FIXED_TRAINING_GRADUATION_REQUIREMENTS, employee),
        `${getTrainingPeriodYears(employee)} Year(s) Training Period From First Appointment`,
        getTrainingPeriodEndDate(employee)
    );

    const showTrainingGraduationSection = isTrainingEmployee(employee);

    const showPermanentSection =
        isPermanent && ["III", "II", "I", "Supra", "Special"].includes(grade);

    const showGrade2Section =
        isPermanent
        && (
            (grade === "III" && hasConfirmedPermanent)
            || ["II", "I", "Supra", "Special"].includes(grade)
        );

    const showGrade1Section =
        isPermanent && ["II", "I", "Supra", "Special"].includes(grade);

    const showSupraSection =
        isPermanent
        && serviceAllowsSupra(service)
        && ["I", "Supra"].includes(grade);

    const showSpecialSection =
        isPermanent
        && serviceAllowsSpecial(service)
        && ["I", "Special"].includes(grade);

    const visibleSections = [
        showTrainingGraduationSection && trainingRows.length > 0
            ? {
                title: "Training → Permanent Requirements",
                description:
                    "Pass the training examination and complete the training period before appointing this employee as permanent.",
                meta: `Training period is counted from first appointment date (${formatDate(employee.dateOfFirstAppointment)}).`,
                rows: trainingRows,
                eligibilityDate: getTrainingPeriodEndDate(employee),
                promotionReadyLabel: "Ready for permanent appointment"
            }
            : null,
        showPermanentSection && permanentRows.length > 0
            ? {
                title: "Permanent Requirements",
                description:
                    "Grade III permanency qualifications defined by the service.",
                meta: grade === "III" && !hasConfirmedPermanent
                    ? "Employee is on probation — complete these to qualify for permanent status."
                    : null,
                rows: permanentRows,
                eligibilityDate: permanentQualificationDate,
                promotionReadyLabel: "Qualified for permanent"
            }
            : null,
        showGrade2Section && grade2Rows.length > 0
            ? {
                title: "Grade II Promotion Requirements",
                description:
                    "Requirements to qualify for promotion from Grade III to Grade II.",
                meta: `Service counted from first appointment date (${formatDate(employee.dateOfFirstAppointment || getGrade3AchievedDate(employee))}).`,
                rows: grade2Rows,
                eligibilityDate:
                    careerProgression.grade2EligibilityDate
                    ?? getGrade2EligibilityDate(employee, { service }),
                promotionReadyLabel: "Ready for Grade II promotion"
            }
            : null,
        showGrade1Section && grade1Rows.length > 0
            ? {
                title: "Grade I Promotion Requirements",
                description:
                    "Requirements to qualify for promotion from Grade II to Grade I.",
                meta: `Grade II service counted from achievement date (${formatDate(getGrade2AchievedDate(employee) || employee.appointmentDateToPresentClassGrade)}).`,
                rows: grade1Rows,
                eligibilityDate:
                    careerProgression.grade1EligibilityDate
                    ?? getGrade1EligibilityDate(employee, { service }),
                promotionReadyLabel: "Ready for Grade I promotion"
            }
            : null,
        showSupraSection && supraRows.length > 0
            ? {
                title: "Supra Promotion Requirements",
                description:
                    "Requirements to qualify for promotion from Grade I to Supra.",
                meta: `Grade I service counted from achievement date (${formatDate(getGrade1AchievedDate(employee) || employee.appointmentDateToPresentClassGrade)}).`,
                rows: supraRows,
                eligibilityDate:
                    careerProgression.supraEligibilityDate
                    ?? getSupraEligibilityDate(employee, { service }),
                promotionReadyLabel: "Ready for Supra promotion"
            }
            : null,
        showSpecialSection && specialRows.length > 0
            ? {
                title: "Special Promotion Requirements",
                description:
                    "Requirements to qualify for promotion from Grade I to Special.",
                meta: `Grade I service counted from achievement date (${formatDate(getGrade1AchievedDate(employee) || employee.appointmentDateToPresentClassGrade)}).`,
                rows: specialRows,
                eligibilityDate:
                    careerProgression.specialEligibilityDate
                    ?? getSpecialEligibilityDate(employee, { service }),
                promotionReadyLabel: "Ready for Special promotion"
            }
            : null
    ].filter(Boolean);

    const allRows = visibleSections.flatMap((section) => section.rows);
    const overall = sectionProgress(allRows);
    const allSectionsEligible = visibleSections.every((section) => {
        const sectionProgressValue = sectionProgress(section.rows);
        const dateMet = !section.eligibilityDate
            || isDateReached(section.eligibilityDate);
        return sectionProgressValue.percent === 100 && dateMet;
    });

    const renderContent = (body) => {
        if (embedded) {
            return <Box>{body}</Box>;
        }

        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Qualifications & Requirements
                </Typography>
                <Divider sx={{ mb: 2.5 }} />
                {body}
            </Paper>
        );
    };

    if (!isPermanent && !isTrainingEmployee(employee)) {
        return renderContent(
            <Typography color="text.secondary">
                Qualification tracking applies to permanent government employees only.
            </Typography>
        );
    }

    if (!visibleSections.length) {
        return renderContent(
            <Typography color="text.secondary">
                No qualification requirements are configured for this employee.
            </Typography>
        );
    }

    return renderContent(
        <>
            {isTrainingEmployee(employee) && !isTrainingGraduationEligible(employee) && (
                <Alert severity="warning" sx={{ mb: 2.5 }}>
                    {getTrainingGraduationBlockReason(employee)}
                </Alert>
            )}
            <QualificationsSummary
                employee={employee}
                overall={overall}
                allSectionsEligible={allSectionsEligible}
                onUpdateQualifications={onUpdateQualifications}
                qualificationsActionLabel={qualificationsActionLabel}
            />

            <Stack spacing={2.5}>
                {visibleSections.map((section) => (
                    <RequirementSection
                        key={section.title}
                        title={section.title}
                        description={section.description}
                        meta={section.meta}
                        rows={section.rows}
                        eligibilityDate={section.eligibilityDate}
                        promotionReadyLabel={section.promotionReadyLabel}
                    />
                ))}
            </Stack>
        </>
    );
}
