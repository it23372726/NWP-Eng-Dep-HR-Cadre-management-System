import {
    Button,
    Chip,
    Grid,
    Stack,
    Typography
} from "@mui/material";
import {
    DirectionsCarOutlined as VehicleIcon,
    EventAvailableOutlined as IncrementIcon,
    LocalActivityOutlined as PermitIcon,
    RedeemOutlined as BenefitsIcon
} from "@mui/icons-material";
import {
    EmployeeProfileEmptyState,
    EmployeeProfileInfoItem,
    EmployeeProfileSection as ProfileSection
} from "./EmployeeProfileSection";
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

function InfoField({ label, value, size = { xs: 12, sm: 6, md: 4 } }) {
    return (
        <Grid size={size}>
            <EmployeeProfileInfoItem label={label} value={value} sx={{ height: "100%" }} />
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
            <EmployeeProfileEmptyState
                icon={<BenefitsIcon />}
                title="No active benefits or allowances"
                description="There are no vehicle, permit, or salary-increment benefits to show for this employee at this time."
            />
        );
    }

    return (
        <Stack spacing={3}>
            {showPrivateVehicleSection && (
                <ProfileSection
                    icon={<VehicleIcon fontSize="small" />}
                    title="Private vehicle for government work"
                    description="Vehicle identification, insurance, rental, and permission details."
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
                    <Grid container spacing={1.25}>
                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
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
                    icon={<PermitIcon fontSize="small" />}
                    title="Vehicle Permit"
                    description="Eligibility and collection schedule for the employee's vehicle permit."
                    action={
                        (vehiclePermitStatus?.canCollectNow && onRecordVehiclePermit)
                        || (hasVehiclePermitCollection && (onEditVehiclePermit || onUndoVehiclePermit)) ? (
                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
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
                    <Grid container spacing={1.25}>
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
                    icon={<IncrementIcon fontSize="small" />}
                    title="Salary Increment"
                    description="Annual increment schedule and the employee's latest completed increment."
                    action={
                        (salaryIncrementStatus?.canRecordNow && onRecordSalaryIncrement)
                        || (hasSalaryIncrementRecord && (onEditSalaryIncrement || onUndoSalaryIncrement)) ? (
                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
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
                    <Grid container spacing={1.25}>
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
                <ProfileSection
                    icon={<IncrementIcon fontSize="small" />}
                    title="Salary Increment"
                    description="Annual increment information for this training employee."
                >
                    <Grid container spacing={1.25}>
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
