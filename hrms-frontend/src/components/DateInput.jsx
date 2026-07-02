import { TextField } from "@mui/material";

import { mergeDateInputSlotProps } from "../utils/formLayout";

/**
 * Native date field with MUI v9-safe label positioning (always shrunk above the input).
 */
export default function DateInput({ slotProps, value, fullWidth = true, ...props }) {
    return (
        <TextField
            type="date"
            size="small"
            fullWidth={fullWidth}
            value={value ?? ""}
            {...props}
            slotProps={mergeDateInputSlotProps(slotProps)}
        />
    );
}
