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
import {
    getPrivateVehicleExpireStatusColor,
    getPrivateVehicleExpireStatusLabel,
    getPrivateVehicleExpireStatus
} from "../utils/privateVehicle";
import {
    formatVehiclePermitDate,
    getVehiclePermitStatusColor,
    getVehiclePermitStatusLabel,
    isSeniorEmployee
} from "../utils/vehiclePermit";
import {
    formatIncrementDay,
    formatSalaryIncrementDate,
    getSalaryIncrementStatusColor,
    getSalaryIncrementStatusLabel
} from "../utils/salaryIncrement";
import { isPermanentEmployee, isTrainingEmployee } from "../constants/hrms";

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

export default function EmployeeProfileBenefitsTab({
    employee,
    onRevokePrivateVehicle,
    vehiclePermitStatus,
    onRecordVehiclePermit,
    onEditVehiclePermit,
    onUndoVehiclePermit,
    salaryIncrementStatus,
    onRecordSalaryIncrement,
    onEditSalaryIncrement,
    onUndoSalaryIncrement
}) {
    const showPrivateVehicleSection = isPermanentEmployee(employee?.employmentType)
        && employee.privateVehicleUsedForGovWork === true;
    const privateVehicleExpireStatus = getPrivateVehicleExpireStatus(employee);
    const showVehiclePermitSection = isSeniorEmployee(employee)
        && vehiclePermitStatus?.applicable;
    const hasVehiclePermitCollection = Boolean(
        vehiclePermitStatus?.lastCollectedDate ?? employee.vehiclePermitCollectedDate
    );
    const showSalaryIncrementSection = Boolean(
        salaryIncrementStatus?.applicable && employee.incremantDate
    );
    const showTrainingIncrementInfo = isTrainingEmployee(employee)
        && employee.incremantDate
        && !showSalaryIncrementSection;
    const hasSalaryIncrementRecord = Boolean(
        salaryIncrementStatus?.lastDoneDate ?? employee.salaryIncrementDoneDate
    );

    if (!showPrivateVehicleSection && !showVehiclePermitSection
        && !showSalaryIncrementSection && !showTrainingIncrementInfo) {
        return (
            <Paper sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    No benefits or allowances apply to this employee at this time.
                </Typography>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
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
                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    color={getPrivateVehicleExpireStatusColor(
                                        privateVehicleExpireStatus
                                    )}
                                    label={getPrivateVehicleExpireStatusLabel(
                                        privateVehicleExpireStatus
                                    )}
                                />
                                {employee.privateVehicleRented && (
                                    <Chip
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        label="Rented vehicle"
                                    />
                                )}
                            </Stack>
                        </Grid>
                        <InfoField
                            label="Vehicle"
                            value={employee.privateVehicleDescription}
                        />
                        <InfoField
                            label="License plate number"
                            value={employee.privateVehicleLicensePlateNumber}
                        />
                        <InfoField
                            label="Insurance number"
                            value={employee.privateVehicleInsuranceNumber}
                        />
                        <InfoField
                            label="Rented vehicle"
                            value={employee.privateVehicleRented ? "Yes" : "No"}
                        />
                        {employee.privateVehicleRented && (
                            <InfoField
                                label="From whom"
                                value={employee.privateVehicleRentedFrom}
                            />
                        )}
                        <InfoField
                            label="Permission granted on"
                            value={formatDate(employee.privateVehiclePermissionDate)}
                        />
                        <InfoField
                            label="Expire date"
                            value={formatDate(employee.privateVehicleExpireDate)}
                        />
                    </Grid>
                </ProfileSection>
            )}

            {showVehiclePermitSection && (
                <ProfileSection
                    title="Vehicle Permit"
                    action={
                        (vehiclePermitStatus?.canCollectNow && onRecordVehiclePermit)
                        || (hasVehiclePermitCollection && (onEditVehiclePermit || onUndoVehiclePermit)) ? (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {vehiclePermitStatus?.canCollectNow && onRecordVehiclePermit && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={onRecordVehiclePermit}
                                    >
                                        Record collection
                                    </Button>
                                )}
                                {hasVehiclePermitCollection && onEditVehiclePermit && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={onEditVehiclePermit}
                                    >
                                        Edit date
                                    </Button>
                                )}
                                {hasVehiclePermitCollection && onUndoVehiclePermit && (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        onClick={onUndoVehiclePermit}
                                    >
                                        Undo collection
                                    </Button>
                                )}
                            </Stack>
                        ) : null
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

            {showSalaryIncrementSection && (
                <ProfileSection
                    title="Salary Increment"
                    action={
                        (salaryIncrementStatus?.canRecordNow && onRecordSalaryIncrement)
                        || (hasSalaryIncrementRecord && (onEditSalaryIncrement || onUndoSalaryIncrement)) ? (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {salaryIncrementStatus?.canRecordNow && onRecordSalaryIncrement && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={onRecordSalaryIncrement}
                                    >
                                        Record increment
                                    </Button>
                                )}
                                {hasSalaryIncrementRecord && onEditSalaryIncrement && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={onEditSalaryIncrement}
                                    >
                                        Edit date
                                    </Button>
                                )}
                                {hasSalaryIncrementRecord && onUndoSalaryIncrement && (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        onClick={onUndoSalaryIncrement}
                                    >
                                        Undo increment
                                    </Button>
                                )}
                            </Stack>
                        ) : null
                    }
                >
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Chip
                                color={getSalaryIncrementStatusColor(salaryIncrementStatus)}
                                label={getSalaryIncrementStatusLabel(salaryIncrementStatus)}
                            />
                        </Grid>
                        {salaryIncrementStatus?.canCatchUpToCurrentYear && (
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Multiple years are overdue. Use catch-up when recording
                                    to mark all increments through the current year at once.
                                </Typography>
                            </Grid>
                        )}
                        <InfoField
                            label="Annual increment day"
                            value={formatIncrementDay(employee.incremantDate)}
                        />
                        <InfoField
                            label="Next due date"
                            value={formatSalaryIncrementDate(salaryIncrementStatus.nextDueDate)}
                        />
                        <InfoField
                            label="Last completed"
                            value={formatSalaryIncrementDate(
                                salaryIncrementStatus.lastDoneDate
                                    ?? employee.salaryIncrementDoneDate
                            )}
                        />
                    </Grid>
                </ProfileSection>
            )}
            {showTrainingIncrementInfo && (
                <ProfileSection title="Salary Increment">
                    <Grid container spacing={2.5}>
                        <InfoField
                            label="Annual increment day"
                            value={formatIncrementDay(employee.incremantDate)}
                        />
                        {!employee.dateOfFirstAppointment && (
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Set the date of first appointment to enable increment
                                    tracking and due-date calculations.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </ProfileSection>
            )}
        </Stack>
    );
}
