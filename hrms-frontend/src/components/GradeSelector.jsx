import { Box, Chip, FormHelperText, Stack } from "@mui/material";

import { GRADES } from "../constants/hrms";

export default function GradeSelector({
    selectedGrades,
    onToggle,
    error,
    availableGrades = null
}) {
    const grades = availableGrades?.length
        ? GRADES.filter((grade) => availableGrades.includes(grade))
        : GRADES;

    return (
        <Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                {grades.map((grade) => {
                    const selected = selectedGrades.includes(grade);
                    return (
                        <Chip
                            key={grade}
                            label={grade}
                            clickable
                            onClick={() => onToggle(grade)}
                            color={selected ? "primary" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            sx={{ fontWeight: selected ? 600 : 400 }}
                        />
                    );
                })}
            </Stack>
            {error && (
                <FormHelperText error sx={{ mt: 1, mx: 0 }}>
                    {error}
                </FormHelperText>
            )}
            {!error && (selectedGrades.includes("Supra") || selectedGrades.includes("Special")) && (
                <FormHelperText sx={{ mt: 1, mx: 0 }}>
                    Supra and Special are alternative promotion paths. Only one can be selected per service.
                </FormHelperText>
            )}
        </Box>
    );
}
