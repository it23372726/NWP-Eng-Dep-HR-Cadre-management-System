import { Chip } from "@mui/material";

import {
    EMPLOYMENT_TYPE_CHIP_STYLES,
    getEmploymentTypeLabel,
    isTrainingEmployee
} from "../constants/hrms";

export default function EmploymentTypeChip({
    employmentType,
    employee = null,
    size = "small"
}) {
    const isTraining = isTrainingEmployee(employee);

    if (!isTraining && (!employmentType || employmentType === "PERMANENT")) {
        return null;
    }

    const chipKey = isTraining ? "TRAINING" : employmentType;
    const style = EMPLOYMENT_TYPE_CHIP_STYLES[chipKey] || {
        bgcolor: "grey.200",
        color: "text.primary"
    };

    return (
        <Chip
            label={getEmploymentTypeLabel(employmentType, employee)}
            size={size}
            variant="filled"
            sx={{
                fontWeight: 600,
                bgcolor: style.bgcolor,
                color: style.color,
                border: "none"
            }}
        />
    );
}
