import { Chip } from "@mui/material";
import { PERMANENT_STATUS_COLORS, PERMANENT_STATUS_LABELS } from "../constants/hrms";

export default function PermanentStatusChip({ status }) {
    return (
        <Chip
            label={PERMANENT_STATUS_LABELS[status] || "Probation"}
            color={PERMANENT_STATUS_COLORS[status] || "warning"}
            size="small"
            variant="filled"
        />
    );
}
