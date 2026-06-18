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
import { formatMonthDayDisplay } from "../utils/monthDayDate";
import { NWP_ENGINEERING_DEPARTMENT } from "../constants/hrms";
import {
    getGrade1AchievedDate,
    getGrade2AchievedDate,
    getGrade3AchievedDate
} from "../utils/gradeAchievementDates";
import {
    calculateRetirementDate,
    formatEmployeeDate
} from "../utils/employeeRetirement";
import {
    formatVehiclePermitDate,
    getVehiclePermitStatusColor,
    getVehiclePermitStatusLabel,
    isSeniorEmployee
} from "../utils/vehiclePermit";

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
        <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} textAlign="right">
                {value}
            </Typography>
        </Stack>
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
                flexDirection: "column"
            }}
        >
            <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
            >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
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
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {description}
                        </Typography>
                    </Box>
                </Stack>
                {statusChip}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
                {details.map(({ label, value }) => (
                    <MilestoneDetail key={label} label={label} value={value} />
                ))}
            </Stack>

            {action && <Box sx={{ mt: 2 }}>{action}</Box>}
        </Paper>
    );
}

const gradeRank = { None: 0, III: 1, II: 2, I: 3 };

function getGradeMilestoneStatus(currentGrade, targetGrade, qualified) {
    const current = gradeRank[currentGrade] ?? 0;
    const target = gradeRank[targetGrade] ?? 0;

    if (current >= target) {
        return { label: "Achieved", color: "success" };
    }
    if (qualified) {
        return { label: "Qualified", color: "info" };
    }
    return { label: "In progress", color: "warning" };
}

export default function EmployeeProfilePersonalTab({
    employee,
    grade2RequiredYears,
    grade1RequiredYears,
    threeYearDate,
    canMakePermanent,
    onMakePermanent,
    onRevokePrivateVehicle,
    vehiclePermitStatus,
    onRecordVehiclePermit
}) {
    const career = employee.careerProgression;
    const serviceLabel = employee.designation?.service
        ? `${employee.designation.service.serviceCode} — ${employee.designation.service.description}`
        : "—";
    const isPermanentEmployee = employee.employmentType === "PERMANENT";
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
    const showPrivateVehicleSection = employee.privateVehicleUsedForGovWork === true;
    const showVehiclePermitSection = isSeniorEmployee(employee)
        && vehiclePermitStatus?.applicable;

    return (
        <Stack spacing={3}>
            <ProfileSection title="Personal Details">
                <Grid container spacing={2.5}>
                    <InfoField label="NIC" value={employee.nic} />
                    <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                    <InfoField
                        label="Expected Retirement Date"
                        value={formatEmployeeDate(calculateRetirementDate(employee.dateOfBirth))}
                    />
                    <InfoField label="Gender" value={employee.gender} />
                    <InfoField label="Marital Status" value={employee.maritalStatus} />
                    <InfoField label="Contact Number" value={employee.contactNo} />
                    <InfoField label="Resident District" value={employee.residentDistrict} />
                    <InfoField
                        label="Permanent Address"
                        value={employee.permanentAddress}
                        size={{ xs: 12 }}
                    />
                </Grid>
            </ProfileSection>

            {showPrivateVehicleSection && (
                <ProfileSection
                    title="Private Vehicle — Government Work"
                    action={
                        onRevokePrivateVehicle && (
                            <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                onClick={onRevokePrivateVehicle}
                            >
                                Stop using private vehicle
                            </Button>
                        )
                    }
                >
                    <Grid container spacing={2.5}>
                        <InfoField
                            label="Vehicle"
                            value={employee.privateVehicleDescription}
                        />
                        <InfoField
                            label="Permission granted on"
                            value={formatDate(employee.privateVehiclePermissionDate)}
                        />
                    </Grid>
                </ProfileSection>
            )}

            {showVehiclePermitSection && (
                <ProfileSection
                    title="Vehicle Permit"
                    action={
                        vehiclePermitStatus?.canCollectNow && onRecordVehiclePermit && (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={onRecordVehiclePermit}
                            >
                                Record collection
                            </Button>
                        )
                    }
                >
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12 }}>
                            <Chip
                                size="small"
                                color={getVehiclePermitStatusColor(vehiclePermitStatus)}
                                label={getVehiclePermitStatusLabel(vehiclePermitStatus)}
                            />
                        </Grid>
                        <InfoField
                            label="Senior since"
                            value={formatVehiclePermitDate(vehiclePermitStatus.seniorSinceDate)}
                        />
                        <InfoField
                            label="Last collected"
                            value={formatVehiclePermitDate(
                                vehiclePermitStatus.lastCollectedDate
                                    ?? employee.vehiclePermitCollectedDate
                            )}
                        />
                        <InfoField
                            label="Next collectable"
                            value={formatVehiclePermitDate(vehiclePermitStatus.nextCollectableDate)}
                        />
                    </Grid>
                </ProfileSection>
            )}

            <ProfileSection title="Employment & Assignment">
                <Stack spacing={3}>
                    <ProfileSubsection title="Current Assignment">
                        <InfoField label="Current Grade" value={employee.grade} />
                        <InfoField
                            label="Service Level"
                            value={employee.serviceLevel?.levelName}
                        />
                        <InfoField label="Service" value={serviceLabel} />
                        <InfoField
                            label="Department"
                            value={employee.currentDepartment}
                        />
                        <InfoField
                            label="Office"
                            value={employee.currentOffice}
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
                    </ProfileSubsection>

                    <Divider />

                    <ProfileSubsection title="Employment">
                        <InfoField label="Employment Type" value={employee.employmentType} />
                        {showPreviousOrganization && (
                            <InfoField
                                label="Previous Organization"
                                value={previousOrganization}
                            />
                        )}
                    </ProfileSubsection>

                    <Divider />

                    <ProfileSubsection title="Service Timeline">
                        <InfoField
                            label="Date of First Appointment"
                            value={formatDate(employee.dateOfFirstAppointment)}
                        />
                        <InfoField
                            label="Entered All Island Service"
                            value={formatDate(employee.enteredDateToAllIslandService)}
                        />
                        <InfoField
                            label="Entered NWP Council"
                            value={formatDate(employee.enteredDateToNWPCouncil)}
                        />
                        <InfoField
                            label="Reported to Present Working Place"
                            value={formatDate(employee.reportedDateToPresentWorkingPlace)}
                        />
                        <InfoField
                            label="Appointment to Present Class / Grade"
                            value={formatDate(employee.appointmentDateToPresentClassGrade)}
                        />
                        <InfoField
                            label="Increment Date"
                            value={formatMonthDayDisplay(employee.incremantDate)}
                        />
                    </ProfileSubsection>
                </Stack>
            </ProfileSection>

            <ProfileSection title="Career Progression">
                {!isPermanentEmployee ? (
                    <Typography color="text.secondary">
                        Career progression milestones apply to permanent government employees.
                    </Typography>
                ) : (
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <CareerMilestoneCard
                                step={1}
                                title="Permanent Confirmation"
                                description="Complete Grade III requirements and 3-year service."
                                statusChip={permanentStatusChip}
                                details={[
                                    {
                                        label: "3-Year Service Due",
                                        value: threeYearDate
                                            ? formatDate(threeYearDate)
                                            : "—"
                                    },
                                    {
                                        label: "Qualification Date",
                                        value: formatDate(career?.permanentQualificationDate)
                                    },
                                    {
                                        label: "Grade III Achieved",
                                        value: formatDate(getGrade3AchievedDate(employee))
                                    }
                                ]}
                                action={
                                    canMakePermanent && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            fullWidth
                                            onClick={onMakePermanent}
                                        >
                                            Make Permanent
                                        </Button>
                                    )
                                }
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <CareerMilestoneCard
                                step={2}
                                title="Grade II Promotion"
                                description="Service and requirements counted from first appointment."
                                statusChip={
                                    <Chip
                                        size="small"
                                        color={grade2Status.color}
                                        label={grade2Status.label}
                                    />
                                }
                                details={[
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
                                ]}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <CareerMilestoneCard
                                step={3}
                                title="Grade I Promotion"
                                description="Service and requirements in present Grade II class."
                                statusChip={
                                    <Chip
                                        size="small"
                                        color={grade1Status.color}
                                        label={grade1Status.label}
                                    />
                                }
                                details={[
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
                                ]}
                            />
                        </Grid>
                    </Grid>
                )}
            </ProfileSection>
        </Stack>
    );
}
