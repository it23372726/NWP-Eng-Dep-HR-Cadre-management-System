import { Box, Typography } from "@mui/material";

import GradeChips from "./GradeChips";

export default function DesignationOptionContent({ designation, suffix = "" }) {
    if (!designation) {
        return null;
    }

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                width: "100%",
                minWidth: 0
            }}
        >
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {designation.designationName}
                {suffix}
            </Typography>
            <GradeChips grades={designation.allowedGrades} compact />
        </Box>
    );
}
