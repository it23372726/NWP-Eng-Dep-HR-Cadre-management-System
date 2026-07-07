import {
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    Paper,
    Stack,
    Typography
} from "@mui/material";
import PermanentStatusChip from "./PermanentStatusChip";
import {
    getEmploymentTypeLabel,
    formatTrainingPeriodYears,
    isContractEmployee,
    isTrainingEmployee,
    NWP_ENGINEERING_DEPARTMENT,
    resolveEmployeeDesignationName,
    resolveEmployeeService,
    canShowDependentDetails,
    serviceAllowsSpecial,
    serviceAllowsSupra
} from "../constants/hrms";
import {
    getGrade1AchievedDate,
    getGrade2AchievedDate,
    getGrade3AchievedDate,
    getSpecialAchievedDate,
    getSpecialEligibilityDate,
    getSupraAchievedDate,
    getSupraEligibilityDate,
    normalizeRequiredYears
} from "../utils/gradeAchievementDates";
import { gradeRank } from "../utils/reportSortOrder";
import {
    calculateRetirementDate,
    formatEmployeeDate
} from "../utils/employeeRetirement";
import {
    formatChildRelationship,
    isMarriedStatus
} from "../utils/employeeDependentForm";
const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "—";

function ProfileSection({ title, action, children }) {
    return (
        <Paper sx={{ p: 3 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
            >
                <Typography variant="h6">{title}</Typography>
                {action}
            </Stack>
            <Divider sx={{ my: 2 }} />
            {children}
        </Paper>
    );
}

function ProfileSubsection({ title, children }) {
    return (
        <Box>
            <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 700, letterSpacing: 0.8, display: "block" }}
            >
                {title}
            </Typography>
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                {children}
            </Grid>
        </Box>
    );
}

function InfoField({ label, value, size = { xs: 12, sm: 6, md: 4 } }) {
    return (
        <Grid size={size}>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
            >
                {label}
            </Typography>
            <Typography variant="body1">{value ?? "—"}</Typography>
        </Grid>
    );
}

function MilestoneDetail({ label, value }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.25, lineHeight: 1.4 }}
            >
                {label}
            </Typography>
            <Typography
                variant="body2"
                fontWeight={500}
                sx={{ lineHeight: 1.5, wordBreak: "break-word" }}
            >
                {value}
            </Typography>
        </Box>
    );
}

function CareerMilestoneCard({
    step,
    title,
    description,
    statusChip,
    details,
    action
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                minWidth: 0
            }}
        >
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", minWidth: 0 }}>
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0
                        }}
                    >
                        {step}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                            {title}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25, lineHeight: 1.45, wordBreak: "break-word" }}
                        >
                            {description}
                        </Typography>
                    </Box>
                </Stack>

                {statusChip && (
                    <Box sx={{ alignSelf: "flex-start", maxWidth: "100%" }}>{statusChip}</Box>
                )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                {details.map(({ label, value }) => (
                    <MilestoneDetail key={label} label={label} value={value} />
                ))}
            </Stack>

            {action && <Box sx={{ mt: 2 }}>{action}</Box>}
        </Paper>
    );
}

function getGradeMilestoneStatus(currentGrade, targetGrade, qualified) {
    const current = gradeRank(currentGrade);
    const target = gradeRank(targetGrade);

    if (current <= target) {
        return { label: "Achieved", color: "success" };
    }
    if (qualified) {
        return { label: "Qualified", color: "info" };
    }
    return { label: "In progress", color: "warning" };
}

const MILESTONE_TARGET_GRADE = {
    permanent: "III",
    grade2: "II",
    grade1: "I",
    supra: "Supra",
    special: "Special"
};

function getCareerMilestoneChain(service) {
    const chain = ["permanent", "grade2", "grade1"];
    if (serviceAllowsSupra(service)) {
        chain.push("supra");
    } else if (serviceAllowsSpecial(service)) {
        chain.push("special");
    }
    return chain;
}

function getVisibleCareerMilestoneIds(employeeGrade, service) {
    const chain = getCareerMilestoneChain(service);
    const currentRank = gradeRank(employeeGrade);

    let lastReachedIndex = -1;
    chain.forEach((id, index) => {
        const targetRank = gradeRank(MILESTONE_TARGET_GRADE[id]);
        if (currentRank <= targetRank) {
            lastReachedIndex = index;
        }
    });

    const showThrough = Math.min(lastReachedIndex + 1, chain.length - 1);
    return chain.slice(0, showThrough + 1);
}

function buildCareerProgressionMilestones({
    employee,
    career,
    service,
    grade2RequiredYears,
    grade1RequiredYears,
    supraRequiredYears,
    specialRequiredYears,
    threeYearDate,
    permanentStatusChip,
    grade2Status,
    grade1Status,
    supraStatus,
    specialStatus,
    canMakePermanent,
    onMakePermanent
}) {
    const milestoneConfigs = {
        permanent: {
            title: "Permanent Confirmation",
            description: "Complete Grade III requirements and 3-year service.",
            statusChip: permanentStatusChip,
            details: [
                {
                    label: "3-Year Service Due",
                    value: threeYearDate ? formatDate(threeYearDate) : "—"
                },
                {
                    label: "Qualification Date",
                    value: formatDate(career?.permanentQualificationDate)
                },
                {
                    label: "Grade III Achieved",
                    value: formatDate(getGrade3AchievedDate(employee))
                }
            ],
            action: canMakePermanent && (
                <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={onMakePermanent}
                >
                    Make Permanent
                </Button>
            )
        },
        grade2: {
            title: "Grade II Promotion",
            description: "Service and requirements counted from first appointment.",
            statusChip: (
                <Chip
                    size="small"
                    color={grade2Status.color}
                    label={grade2Status.label}
                />
            ),
            details: [
                {
                    label: "Required Service Period",
                    value: grade2RequiredYears != null
                        ? `${grade2RequiredYears} year(s) from first appointment`
                        : "—"
                },
                {
                    label: "Grade II Achieved",
                    value: formatDate(getGrade2AchievedDate(employee))
                },
                {
                    label: "Eligibility Date",
                    value: formatDate(career?.grade2EligibilityDate)
                },
                {
                    label: "Target Grade",
                    value: "Grade II"
                }
            ]
        },
        grade1: {
            title: "Grade I Promotion",
            description: "Service and requirements in present Grade II class.",
            statusChip: (
                <Chip
                    size="small"
                    color={grade1Status.color}
                    label={grade1Status.label}
                />
            ),
            details: [
                {
                    label: "Required Service Period",
                    value: grade1RequiredYears != null
                        ? `${grade1RequiredYears} year(s) after Grade II`
                        : "—"
                },
                {
                    label: "Grade I Achieved",
                    value: formatDate(getGrade1AchievedDate(employee))
                },
                {
                    label: "Eligibility Date",
                    value: formatDate(career?.grade1EligibilityDate)
                },
                {
                    label: "Target Grade",
                    value: "Grade I"
                }
            ]
        },
        supra: {
            title: "Supra Promotion",
            description: "Service and requirements in present Grade I class.",
            statusChip: (
                <Chip
                    size="small"
                    color={supraStatus.color}
                    label={supraStatus.label}
                />
            ),
            details: [
                {
                    label: "Required Service Period",
                    value: supraRequiredYears != null
                        ? `${supraRequiredYears} year(s) after Grade I`
                        : "—"
                },
                {
                    label: "Supra Achieved",
                    value: formatDate(getSupraAchievedDate(employee))
                },
                {
                    label: "Eligibility Date",
                    value: formatDate(
                        career?.supraEligibilityDate
                        ?? getSupraEligibilityDate(employee, { service })
                    )
                },
                {
                    label: "Target Grade",
                    value: "Supra"
                }
            ]
        },
        special: {
            title: "Special Promotion",
            description: "Service and requirements in present Grade I class.",
            statusChip: (
                <Chip
                    size="small"
                    color={specialStatus.color}
                    label={specialStatus.label}
                />
            ),
            details: [
                {
                    label: "Required Service Period",
                    value: specialRequiredYears != null
                        ? `${specialRequiredYears} year(s) after Grade I`
                        : "—"
                },
                {
                    label: "Special Achieved",
                    value: formatDate(getSpecialAchievedDate(employee))
                },
                {
                    label: "Eligibility Date",
                    value: formatDate(
                        career?.specialEligibilityDate
                        ?? getSpecialEligibilityDate(employee, { service })
                    )
                },
                {
                    label: "Target Grade",
                    value: "Special"
                }
            ]
        }
    };

    return getVisibleCareerMilestoneIds(employee.grade, service)
        .map((id, index) => ({
            id,
            step: index + 1,
            ...milestoneConfigs[id]
        }));
}

export default function EmployeeProfilePersonalTab({
    employee,
    grade2RequiredYears,
    grade1RequiredYears,
    threeYearDate,
    canMakePermanent,
    onMakePermanent,
    isSystemPending = false
}) {
    const career = employee.careerProgression;
    const service = resolveEmployeeService(employee);
    const serviceLabel = service
        ? `${service.serviceCode} — ${service.description}`
        : "—";
    const isPermanentEmployee = employee.employmentType === "PERMANENT";
    const isContract = isContractEmployee(employee.employmentType);
    const isTraining = isTrainingEmployee(employee);
    const isSimplifiedAssignment = isContract || isTraining;
    const previousOrganization = employee.transferredFrom?.trim() || null;
    const showPreviousOrganization = previousOrganization
        && previousOrganization !== employee.currentDepartment;

    const permanentStatusChip = employee.permanentStatus === "PERMANENT"
        ? <PermanentStatusChip status="PERMANENT" />
        : career?.qualifiedForPermanent
            ? <Chip size="small" color="info" label="Qualified for permanent" />
            : <PermanentStatusChip status={employee.permanentStatus} />;

    const grade2Status = getGradeMilestoneStatus(
        employee.grade,
        "II",
        career?.qualifiedForGrade2
    );
    const grade1Status = getGradeMilestoneStatus(
        employee.grade,
        "I",
        career?.qualifiedForGrade1
    );
    const supraRequiredYears = normalizeRequiredYears(
        service?.supraRequiredYears ?? career?.supraRequiredYears
    );
    const specialRequiredYears = normalizeRequiredYears(
        service?.specialRequiredYears ?? career?.specialRequiredYears
    );
    const supraStatus = getGradeMilestoneStatus(
        employee.grade,
        "Supra",
        career?.qualifiedForSupra
    );
    const specialStatus = getGradeMilestoneStatus(
        employee.grade,
        "Special",
        career?.qualifiedForSpecial
    );
    const careerMilestones = buildCareerProgressionMilestones({
        employee,
        career,
        service,
        grade2RequiredYears,
        grade1RequiredYears,
        supraRequiredYears,
        specialRequiredYears,
        threeYearDate,
        permanentStatusChip,
        grade2Status,
        grade1Status,
        supraStatus,
        specialStatus,
        canMakePermanent,
        onMakePermanent
    });
    return (
        <Stack spacing={3}>
            <ProfileSection title="Personal Details">
                <Grid container spacing={2.5}>
                    <InfoField label="NIC" value={employee.nic} />
                    <InfoField label="TIN" value={employee.tin || "—"} />
                    <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                    <InfoField
                        label="Expected Retirement Date"
                        value={formatEmployeeDate(calculateRetirementDate(employee.dateOfBirth))}
                    />
                    <InfoField label="Gender" value={employee.gender} />
                    <InfoField label="Marital Status" value={employee.maritalStatus} />
                    <InfoField label="Contact Number" value={employee.contactNo} />
                    <InfoField label="Email Address" value={employee.emailAddress || "—"} />
                    <InfoField label="Resident District" value={employee.residentDistrict} />
                    <InfoField
                        label="Permanent Address"
                        value={employee.permanentAddress}
                        size={{ xs: 12 }}
                    />
                </Grid>
            </ProfileSection>

            {canShowDependentDetails(employee)
                && isMarriedStatus(employee.maritalStatus) && (
                <ProfileSection title="Dependent Details">
                    <Stack spacing={3}>
                        <ProfileSubsection title="Spouse">
                            <InfoField label="NIC" value={employee.spouse?.nic} />
                            <InfoField label="Name" value={employee.spouse?.fullName} />
                            <InfoField
                                label="Date of Birth"
                                value={formatDate(employee.spouse?.dateOfBirth)}
                            />
                        </ProfileSubsection>

                        <Divider />

                        <Box>
                            <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontWeight: 700, letterSpacing: 0.8, display: "block" }}
                            >
                                Children
                            </Typography>
                            {employee.children?.length ? (
                                <Stack spacing={2} sx={{ mt: 1.5 }}>
                                    {employee.children.map((child, index) => (
                                        <Paper
                                            key={child.id ?? `child-${index}`}
                                            variant="outlined"
                                            sx={{ p: 2, borderRadius: 2 }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={600}
                                                sx={{ mb: 1.5 }}
                                            >
                                                Child {index + 1}
                                            </Typography>
                                            <Grid container spacing={2.5}>
                                                <InfoField
                                                    label="NIC"
                                                    value={child.nic || "—"}
                                                />
                                                <InfoField
                                                    label="Birth Certificate No."
                                                    value={child.birthCertificateNo}
                                                />
                                                <InfoField
                                                    label="Name"
                                                    value={child.fullName}
                                                />
                                                <InfoField
                                                    label="Date of Birth"
                                                    value={formatDate(child.dateOfBirth)}
                                                />
                                                <InfoField
                                                    label="Relationship"
                                                    value={formatChildRelationship(child.relationship)}
                                                />
                                            </Grid>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 1 }}
                                >
                                    No children recorded.
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </ProfileSection>
            )}

            {!isSystemPending && (
            <ProfileSection title="Employment & Assignment">
                <Stack spacing={3}>
                    <ProfileSubsection title="Employee's Details">
                        <InfoField
                            label="Designation"
                            value={resolveEmployeeDesignationName(employee)}
                        />
                        <InfoField
                            label="Employment Type"
                            value={getEmploymentTypeLabel(employee.employmentType, employee)}
                        />
                        {!isTraining && (
                            <InfoField
                                label="Widows' and Orphans' Pension No."
                                value={employee.widowsOrphansPensionNo || "—"}
                            />
                        )}
                        <InfoField
                            label="Department"
                            value={employee.currentDepartment}
                        />
                        {employee.currentDepartment === NWP_ENGINEERING_DEPARTMENT && (
                            <InfoField
                                label="District of Working"
                                value={
                                    employee.currentDistrictOfWorking?.label
                                    ?? employee.currentDistrictOfWorking
                                }
                            />
                        )}
                        <InfoField
                            label="Office"
                            value={employee.currentOffice}
                        />
                        {showPreviousOrganization && (
                            <InfoField
                                label="Previous Organization"
                                value={previousOrganization}
                            />
                        )}
                    </ProfileSubsection>

                    {!isSimplifiedAssignment && (
                        <>
                            <Divider />

                            <ProfileSubsection title="Current Assignment">
                                <InfoField label="Current Grade" value={employee.grade} />
                                <InfoField
                                    label="Service Level"
                                    value={employee.serviceLevel?.levelName}
                                />
                                <InfoField label="Service" value={serviceLabel} />
                            </ProfileSubsection>
                        </>
                    )}

                    {isTraining && (
                        <>
                            <Divider />
                            <ProfileSubsection title="Current Assignment">
                                <InfoField
                                    label="Service Level"
                                    value={employee.serviceLevel?.levelName || "Training"}
                                />
                                <InfoField
                                    label="Training Period"
                                    value={formatTrainingPeriodYears(
                                        employee.trainingPeriodYears
                                    )}
                                />
                            </ProfileSubsection>
                        </>
                    )}

                    <Divider />

                    <ProfileSubsection title="Service Timeline">
                        {isContract ? (
                            <>
                                <InfoField
                                    label="Contract Start"
                                    value={formatDate(employee.contractStartDate)}
                                />
                                <InfoField
                                    label="Contract End"
                                    value={formatDate(employee.contractEndDate)}
                                />
                                <InfoField
                                    label="Entered Date to the N.W.P. Council"
                                    value={formatDate(employee.enteredDateToNWPCouncil)}
                                />
                                <InfoField
                                    label="Reported to Present Working Place"
                                    value={formatDate(
                                        employee.reportedDateToPresentWorkingPlace
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <InfoField
                                    label="Date of First Appointment"
                                    value={formatDate(employee.dateOfFirstAppointment)}
                                />
                                <InfoField
                                    label="Entered All Island Service"
                                    value={formatDate(employee.enteredDateToAllIslandService)}
                                />
                                <InfoField
                                    label="Entered Date to the N.W.P. Council"
                                    value={formatDate(employee.enteredDateToNWPCouncil)}
                                />
                                <InfoField
                                    label="Reported to Present Working Place"
                                    value={formatDate(
                                        employee.reportedDateToPresentWorkingPlace
                                    )}
                                />
                                <InfoField
                                    label="Appointment to Present Class / Grade"
                                    value={formatDate(
                                        employee.appointmentDateToPresentClassGrade
                                    )}
                                />
                            </>
                        )}
                    </ProfileSubsection>
                </Stack>
            </ProfileSection>
            )}

            {!isSystemPending && !isSimplifiedAssignment && (
            <ProfileSection title="Career Progression">
                {!isPermanentEmployee ? (
                    <Typography color="text.secondary">
                        Career progression milestones apply to permanent government employees.
                    </Typography>
                ) : careerMilestones.length === 0 ? (
                    <Typography color="text.secondary">
                        No career progression milestones are available yet.
                    </Typography>
                ) : (
                    <Grid container spacing={2.5} sx={{ alignItems: "stretch" }}>
                        {careerMilestones.map((milestone) => (
                            <Grid
                                key={milestone.id}
                                size={{ xs: 12, sm: 6, lg: 3 }}
                                sx={{ display: "flex", minWidth: 0 }}
                            >
                                <CareerMilestoneCard
                                    step={milestone.step}
                                    title={milestone.title}
                                    description={milestone.description}
                                    statusChip={milestone.statusChip}
                                    details={milestone.details}
                                    action={milestone.action}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </ProfileSection>
            )}
        </Stack>
    );
}
