import { Chip } from "@mui/material";
import { STATUS_COLORS } from "../constants/hrms";

export default function EmployeeStatusChip({ status }) {
    const label = status === "INACTIVE" ? "Inactive" : "Active";

    return (
        <Chip
            label={label}
            color={STATUS_COLORS[status] || "default"}
            size="small"
            variant="filled"
        />
    );
}
