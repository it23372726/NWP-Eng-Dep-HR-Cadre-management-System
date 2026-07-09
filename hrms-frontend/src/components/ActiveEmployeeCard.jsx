import {
    Box,
    Chip,
    Divider,
    Paper,
    Stack,
    Typography
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import CallIcon from "@mui/icons-material/Call";
import EventIcon from "@mui/icons-material/Event";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WorkIcon from "@mui/icons-material/Work";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import EmployeeAvatar from "./EmployeeAvatar";
import EmploymentTypeChip from "./EmploymentTypeChip";
import PermanentStatusChip from "./PermanentStatusChip";
import { isPermanentEmployee, isSystemPendingEmployee, resolveEmployeeDesignationName, resolveEmployeeService } from "../constants/hrms";
import { getServiceColor } from "../constants/dashboardTheme";
import { formatEmployeeWorkplace } from "../utils/employeeListFilters";
import {
    calculateRetirementDate,
    formatEmployeeDate
} from "../utils/employeeRetirement";

const GRADE_CHIP_COLORS = {
    None: "default",
    III: "info",
    II: "primary",
    I: "secondary",
    Supra: "success",
    Special: "warning"
};

function DetailRow({ icon: Icon, label, value, highlight }) {
    if (!value) {
        return null;
    }

    return (
        <Stack direction="row" spacing={1} alignItems="flex-start">
            <Icon
                sx={{
                    fontSize: 16,
                    color: highlight ? "warning.main" : "text.disabled",
                    mt: 0.2,
                    flexShrink: 0
                }}
            />
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                    {label}
                </Typography>
                <Typography
                    variant="body2"
                    color={highlight ? "warning.dark" : "text.primary"}
                    sx={{ fontWeight: highlight ? 600 : 400 }}
                    noWrap
                >
                    {value}
                </Typography>
            </Box>
        </Stack>
    );
}

function monthsUntilRetirement(dateOfBirth) {
    const retirementDate = calculateRetirementDate(dateOfBirth);
    if (!retirementDate) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        (retirementDate.getFullYear() - today.getFullYear()) * 12
        + (retirementDate.getMonth() - today.getMonth())
    );
}

export default function ActiveEmployeeCard({ employee, onClick }) {
    if (!employee) {
        return null;
    }

    const designation = resolveEmployeeDesignationName(employee);
    const systemPending = isSystemPendingEmployee(employee);
    const serviceLevel = employee.serviceLevel?.levelName;
    const serviceCode = resolveEmployeeService(employee)?.serviceCode;
    const serviceColor = getServiceColor(serviceCode);
    const workplace = formatEmployeeWorkplace(employee);
    const district = employee.currentDistrictOfWorking;
    const positionLine = [designation, serviceLevel].filter(Boolean).join(" · ");
    const monthsToRetire = monthsUntilRetirement(employee.dateOfBirth);
    const showRetirement = monthsToRetire !== null && monthsToRetire >= 0 && monthsToRetire <= 60;
    const retirementHighlight = monthsToRetire !== null && monthsToRetire <= 24;

    return (
        <Paper
            component="button"
            type="button"
            onClick={() => onClick?.(employee)}
            variant="outlined"
            sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "background.paper",
                transition: (theme) =>
                    theme.transitions.create(
                        ["border-color", "box-shadow", "transform"],
                        { duration: theme.transitions.duration.shortest }
                    ),
                "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 3,
                    transform: "translateY(-2px)",
                    "& .card-action": {
                        color: "primary.main"
                    }
                },
                "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2
                }
            }}
        >
            <Box
                sx={{
                    height: 4,
                    bgcolor: serviceColor
                }}
            />

            <Box sx={{ p: 2, pb: 1.5, flex: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <EmployeeAvatar employee={employee} size={56} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                            sx={{ mb: 0.5 }}
                        >
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    lineHeight: 1.3,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                }}
                            >
                                {employee.fullName || "Unnamed employee"}
                            </Typography>
                            {serviceCode && (
                                <Chip
                                    label={serviceCode}
                                    size="small"
                                    sx={{
                                        flexShrink: 0,
                                        height: 20,
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        bgcolor: `${serviceColor}18`,
                                        color: serviceColor,
                                        border: "none"
                                    }}
                                />
                            )}
                        </Stack>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            noWrap
                            title={
                                [
                                    employee.employeeNo ? `S/N ${employee.employeeNo}` : null,
                                    employee.nic || null
                                ].filter(Boolean).join(" · ")
                            }
                            sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                            S/N {employee.employeeNo ?? "—"}
                            {employee.nic ? ` · ${employee.nic}` : ""}
                        </Typography>
                    </Box>
                </Stack>

                <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                    {systemPending ? (
                        <DetailRow
                            icon={WorkIcon}
                            label="Status"
                            value="Career history not recorded"
                        />
                    ) : (
                        <>
                            <DetailRow
                                icon={WorkIcon}
                                label="Position"
                                value={positionLine || "No designation assigned"}
                            />
                            <DetailRow
                                icon={LocationOnIcon}
                                label="Workplace"
                                value={
                                    workplace
                                        || (district ? `${district} district` : null)
                                }
                            />
                        </>
                    )}
                    {employee.contactNo && (
                        <DetailRow
                            icon={CallIcon}
                            label="Contact"
                            value={employee.contactNo}
                        />
                    )}
                    {showRetirement && (
                        <DetailRow
                            icon={EventIcon}
                            label="Retirement"
                            value={`${formatEmployeeDate(calculateRetirementDate(employee.dateOfBirth))} (${monthsToRetire} mo)`}
                            highlight={retirementHighlight}
                        />
                    )}
                </Stack>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {systemPending && (
                        <Chip
                            label="System Pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                    {employee.grade && employee.grade !== "None" && (
                        <Chip
                            label={`Grade ${employee.grade}`}
                            size="small"
                            color={GRADE_CHIP_COLORS[employee.grade] || "default"}
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                    {employee.permanentStatus && isPermanentEmployee(employee.employmentType) && (
                        <PermanentStatusChip status={employee.permanentStatus} />
                    )}
                    {!isPermanentEmployee(employee.employmentType) && (
                        <EmploymentTypeChip
                            employmentType={employee.employmentType}
                            employee={employee}
                        />
                    )}
                    {employee.grade === "III" && employee.careerProgression?.qualifiedForGrade2 && (
                        <Chip
                            label="Grade II ready"
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    )}
                    {employee.grade === "II" && employee.careerProgression?.qualifiedForGrade1 && (
                        <Chip
                            label="Grade I ready"
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    )}
                </Stack>
            </Box>

            <Divider />

            <Stack
                direction="row"
                sx={{
                    px: 2,
                    py: 1,
                    alignItems: "center",
                    justifyContent: "space-between"
                }}
            >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <BadgeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">
                        View profile
                    </Typography>
                </Stack>
                <ArrowForwardIcon
                    className="card-action"
                    sx={{ fontSize: 18, color: "text.disabled", transition: "color 0.2s" }}
                />
            </Stack>
        </Paper>
    );
}
