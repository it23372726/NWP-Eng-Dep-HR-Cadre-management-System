export function mergeDateInputSlotProps(slotProps) {
    return {
        ...slotProps,
        inputLabel: {
            shrink: true,
            ...slotProps?.inputLabel
        }
    };
}

export const datePickerTextFieldProps = {
    size: "small",
    fullWidth: true,
    slotProps: mergeDateInputSlotProps()
};

export function createFormFieldProps(handleChange) {
    const fieldProps = {
        fullWidth: true,
        size: "small",
        onChange: handleChange
    };

    const dateFieldProps = {
        ...fieldProps,
        type: "date",
        slotProps: mergeDateInputSlotProps()
    };

    const selectFieldProps = {
        ...fieldProps,
        select: true,
        slotProps: {
            select: {
                MenuProps: {
                    slotProps: {
                        paper: {
                            sx: { zIndex: 1500 }
                        }
                    }
                }
            }
        },
        sx: {
            width: "100%",
            minWidth: { xs: 0, md: 260 },
            "& .MuiOutlinedInput-root": {
                width: "100%"
            },
            "& .MuiSelect-select": {
                minWidth: { xs: 0, md: 220 }
            }
        }
    };

    return { fieldProps, dateFieldProps, selectFieldProps };
}

export const dialogActionsSx = { px: 3, py: 2 };
