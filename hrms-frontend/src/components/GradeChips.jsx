import { Chip, Stack, Typography } from "@mui/material";

import { sortGradesForDisplay } from "../utils/reportSortOrder";

export default function GradeChips({ grades, compact = false }) {
    const sortedGrades = sortGradesForDisplay(grades);

    if (!sortedGrades.length) {
        return (
            <Typography
                variant="body2"
                color="text.secondary"
                sx={compact ? { fontSize: "0.7rem" } : undefined}
            >
                —
            </Typography>
        );
    }

    return (
        <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ flexShrink: 0 }}
        >
            {sortedGrades.map((grade) => (
                <Chip
                    key={grade}
                    label={grade}
                    size="small"
                    variant="outlined"
                    sx={
                        compact
                            ? {
                                fontSize: "0.65rem",
                                height: 20,
                                "& .MuiChip-label": { px: 0.75 }
                            }
                            : { fontSize: "0.75rem" }
                    }
                />
            ))}
        </Stack>
    );
}
