export function createFormFieldProps(handleChange) {
    const fieldProps = {
        fullWidth: true,
        size: "small",
        onChange: handleChange
    };

    const dateFieldProps = {
        ...fieldProps,
        type: "date",
        slotProps: {
            inputLabel: { shrink: true }
        }
    };

    const selectFieldProps = {
        ...fieldProps,
        select: true,
        sx: {
            width: "100%",
            minWidth: 260,
            "& .MuiOutlinedInput-root": {
                width: "100%"
            },
            "& .MuiSelect-select": {
                minWidth: 220
            }
        }
    };

    return { fieldProps, dateFieldProps, selectFieldProps };
}

export const dialogActionsSx = { px: 3, py: 2 };
