import {
    Box,
    Chip,
    Paper,
    Stack,
    Typography
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WorkIcon from "@mui/icons-material/Work";
import BadgeIcon from "@mui/icons-material/Badge";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import EmployeeAvatar from "./EmployeeAvatar";
import EmploymentTypeChip from "./EmploymentTypeChip";
import EmployeeStatusChip from "./EmployeeStatusChip";
import PermanentStatusChip from "./PermanentStatusChip";
import { isPermanentEmployee, isSystemPendingEmployee, resolveEmployeeDesignationName, resolveEmployeeService } from "../constants/hrms";
import { formatEmployeeWorkplace } from "../utils/employeeListFilters";

const GRADE_CHIP_COLORS = {
    None: "default",
    III: "info",
    II: "primary",
    I: "secondary",
    Supra: "success",
    Special: "warning"
};

function MetaLine({ icon: Icon, children }) {
    if (!children) {
        return null;
    }

    return (
        <Stack direction="row" spacing={0.75} alignItems="center">
            <Icon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
                {children}
            </Typography>
        </Stack>
    );
}

function GradeChip({ grade }) {
    if (!grade || grade === "None") {
        return null;
    }

    return (
        <Chip
            label={`Grade ${grade}`}
            size="small"
            color={GRADE_CHIP_COLORS[grade] || "default"}
            variant="filled"
            sx={{ fontWeight: 600 }}
        />
    );
}

function PromotionChip({ employee }) {
    const career = employee?.careerProgression;

    if (employee?.grade === "III" && career?.qualifiedForGrade2) {
        return (
            <Chip
                label="Qualified for Grade II"
                size="small"
                color="success"
                variant="outlined"
            />
        );
    }

    if (employee?.grade === "II" && career?.qualifiedForGrade1) {
        return (
            <Chip
                label="Qualified for Grade I"
                size="small"
                color="success"
                variant="outlined"
            />
        );
    }

    return null;
}

export default function EmployeeListItem({
    employee,
    onClick,
    variant = "active"
}) {
    if (!employee) {
        return null;
    }

    const designation = resolveEmployeeDesignationName(employee);
    const systemPending = isSystemPendingEmployee(employee);
    const serviceLevel = employee.serviceLevel?.levelName;
    const serviceCode = resolveEmployeeService(employee)?.serviceCode;
    const workplace = formatEmployeeWorkplace(employee);
    const positionLine = [designation, serviceLevel, serviceCode]
        .filter(Boolean)
        .join(" · ");

    const isInactive = variant === "inactive";

    return (
        <Paper
            component="button"
            type="button"
            onClick={() => onClick?.(employee)}
            variant="outlined"
            sx={{
                p: { xs: 1.5, sm: 2 },
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 2 },
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                bgcolor: "background.paper",
                borderRadius: 2,
                transition: (theme) =>
                    theme.transitions.create(
                        ["border-color", "background-color", "box-shadow"],
                        { duration: theme.transitions.duration.shortest }
                    ),
                "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                    boxShadow: 1
                },
                "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2
                }
            }}
        >
            <EmployeeAvatar employee={employee} size={52} />

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 0.5, sm: 1 }}
                    alignItems={{ sm: "center" }}
                    sx={{ mb: 0.5 }}
                >
                    <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        noWrap
                        sx={{ flex: 1, minWidth: 0 }}
                    >
                        {employee.fullName || "Unnamed employee"}
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ flexShrink: 0 }}
                    >
                        <GradeChip grade={employee.grade} />
                        {!isInactive && systemPending && (
                            <Chip
                                label="System Pending"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                        {!isInactive && !systemPending && employee.permanentStatus
                            && isPermanentEmployee(employee.employmentType) && (
                            <PermanentStatusChip status={employee.permanentStatus} />
                        )}
                        {!isInactive && !systemPending && !isPermanentEmployee(employee.employmentType) && (
                            <EmploymentTypeChip
                                employmentType={employee.employmentType}
                                employee={employee}
                            />
                        )}
                        {!isInactive && !systemPending && <PromotionChip employee={employee} />}
                        {isInactive && (
                            <EmployeeStatusChip status={employee.status} />
                        )}
                        {isInactive && employee.employmentType && (
                            <Chip
                                label={
                                    employee.employmentType === "PERMANENT"
                                        ? "Permanent"
                                        : "Non-Permanent"
                                }
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                </Stack>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.75 }}
                    noWrap
                >
                    S/N {employee.employeeNo ?? "—"}
                    {employee.nic ? ` · ${employee.nic}` : ""}
                    {employee.contactNo ? ` · ${employee.contactNo}` : ""}
                </Typography>

                <Stack spacing={0.35}>
                    <MetaLine icon={WorkIcon}>
                        {systemPending
                            ? "Career history not recorded"
                            : (positionLine || "No designation assigned")}
                    </MetaLine>
                    {!systemPending && workplace && (
                        <MetaLine icon={LocationOnIcon}>
                            {workplace}
                        </MetaLine>
                    )}
                    {isInactive && employee.transferredFrom && (
                        <MetaLine icon={BadgeIcon}>
                            Previously at {employee.transferredFrom}
                        </MetaLine>
                    )}
                </Stack>
            </Box>

            <ChevronRightIcon
                sx={{
                    color: "text.disabled",
                    flexShrink: 0,
                    display: { xs: "none", sm: "block" }
                }}
            />
        </Paper>
    );
}
