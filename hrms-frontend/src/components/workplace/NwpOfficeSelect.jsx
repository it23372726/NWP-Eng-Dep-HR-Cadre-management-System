import { Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { normalizeDistrictLabel } from "../../constants/hrms";
import { useOrganizationSettings } from "../../context/OrganizationSettingsContext";
import { getOffices } from "../../services/officeService";

const fieldSx = {
    width: "100%",
    minWidth: 260,
    "& .MuiOutlinedInput-root": {
        width: "100%"
    },
    "& .MuiSelect-select": {
        minWidth: 220
    }
};

const selectMenuProps = {
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
    }
};

export default function NwpOfficeSelect({
    district,
    office,
    onDistrictChange,
    onOfficeChange,
    disabled = false,
    districtLabelText = "Working District",
    officeLabel = "Office"
}) {
    const { districts } = useOrganizationSettings();
    const [offices, setOffices] = useState([]);
    const [loading, setLoading] = useState(false);

    const selectedDistrict = normalizeDistrictLabel(district);

    useEffect(() => {
        let active = true;
        setLoading(true);
        getOffices()
            .then((data) => {
                if (active) {
                    setOffices(data);
                }
            })
            .catch(() => {
                if (active) {
                    setOffices([]);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });
        return () => {
            active = false;
        };
    }, []);

    const filteredOffices = useMemo(
        () => offices.filter(
            (item) => normalizeDistrictLabel(item.district) === selectedDistrict
        ),
        [offices, selectedDistrict]
    );

    return (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    select
                    fullWidth
                    size="small"
                    label={districtLabelText}
                    name="district"
                    value={selectedDistrict}
                    disabled={disabled}
                    required
                    onChange={(event) => {
                        onDistrictChange?.(event.target.value);
                        onOfficeChange?.("");
                    }}
                    sx={fieldSx}
                    {...selectMenuProps}
                >
                    {districts.map((item) => (
                        <MenuItem key={item} value={item}>
                            {item}
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    select
                    fullWidth
                    size="small"
                    label={officeLabel}
                    name="office"
                    value={office || ""}
                    disabled={disabled || !selectedDistrict}
                    required
                    onChange={(event) => onOfficeChange?.(event.target.value)}
                    helperText={
                        !selectedDistrict
                            ? "Select a district first"
                            : loading
                                ? "Loading offices..."
                                : filteredOffices.length === 0
                                    ? "No offices registered for this district"
                                    : undefined
                    }
                    sx={fieldSx}
                    {...selectMenuProps}
                >
                    {filteredOffices.map((item) => (
                        <MenuItem key={item.id} value={item.name}>
                            {item.name}
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>
            {selectedDistrict && office && (
                <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                        Working district: {selectedDistrict}
                    </Typography>
                </Grid>
            )}
        </>
    );
}

export function ReadonlyNwpOfficeFields({
    district,
    office,
    districtLabelText = "Working District",
    officeLabel = "Office"
}) {
    return (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    fullWidth
                    size="small"
                    label={districtLabelText}
                    value={normalizeDistrictLabel(district) || "—"}
                    disabled
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    fullWidth
                    size="small"
                    label={officeLabel}
                    value={office || "—"}
                    disabled
                />
            </Grid>
        </>
    );
}
