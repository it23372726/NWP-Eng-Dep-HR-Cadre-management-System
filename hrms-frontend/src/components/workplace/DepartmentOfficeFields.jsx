import { Grid, MenuItem, TextField } from "@mui/material";

import {
    NWP_ENGINEERING_DEPARTMENT,
    getPrimaryDepartmentName,
    isPrimaryDepartment
} from "../../constants/hrms";
import { useOrganizationSettings } from "../../context/OrganizationSettingsContext";
import { createFormFieldProps } from "../../utils/formLayout";
import NwpOfficeSelect from "./NwpOfficeSelect";

export const DEPARTMENT_OPTIONS = {
    PRIMARY: "PRIMARY",
    OTHER: "OTHER"
};
DEPARTMENT_OPTIONS.NWP = DEPARTMENT_OPTIONS.PRIMARY;

export function resolveDepartmentValue(departmentType, otherDepartmentName) {
    if (
        departmentType === DEPARTMENT_OPTIONS.PRIMARY
        || departmentType === DEPARTMENT_OPTIONS.NWP
    ) {
        return getPrimaryDepartmentName();
    }
    return otherDepartmentName?.trim() || "";
}

export function parseDepartmentValue(department) {
    if (!department) {
        return { departmentType: DEPARTMENT_OPTIONS.PRIMARY, otherDepartmentName: "" };
    }
    if (
        isPrimaryDepartment(department)
        || department === NWP_ENGINEERING_DEPARTMENT
    ) {
        return { departmentType: DEPARTMENT_OPTIONS.PRIMARY, otherDepartmentName: "" };
    }
    return { departmentType: DEPARTMENT_OPTIONS.OTHER, otherDepartmentName: department };
}

export default function DepartmentOfficeFields({
    departmentType,
    otherDepartmentName,
    office,
    district = "",
    onDepartmentTypeChange,
    onOtherDepartmentNameChange,
    onOfficeChange = () => {},
    onDistrictChange = () => {},
    departmentReadOnly = false,
    officeReadOnly = false,
    showDepartment = true,
    showOffice = true,
    departmentLabel = "Department",
    officeLabel = "Office",
    districtLabel = "Working District",
    departmentHelperText,
    officeHelperText,
    excludeNwpDepartment = false
}) {
    const { primaryDepartmentName } = useOrganizationSettings();
    const isPrimary =
        departmentType === DEPARTMENT_OPTIONS.PRIMARY
        || departmentType === DEPARTMENT_OPTIONS.NWP;
    const showNwpOfficeSelect = isPrimary && showOffice && !officeReadOnly;
    const showFreeTextOffice = showOffice && (!isPrimary || officeReadOnly);

    const { fieldProps, selectFieldProps } = createFormFieldProps((event) => {
        const { name, value } = event.target;
        if (name === "departmentType") {
            onDepartmentTypeChange(value);
            if (
                value === DEPARTMENT_OPTIONS.PRIMARY
                || value === DEPARTMENT_OPTIONS.NWP
            ) {
                onOfficeChange("");
                onDistrictChange("");
            } else {
                onDistrictChange("");
            }
        } else if (name === "otherDepartmentName") {
            onOtherDepartmentNameChange(value);
        } else if (name === "office") {
            onOfficeChange(value);
        }
    });

    return (
        <>
            {showDepartment && (
                <>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...selectFieldProps}
                            label={departmentLabel}
                            name="departmentType"
                            value={departmentType}
                            disabled={departmentReadOnly}
                            helperText={departmentHelperText}
                        >
                            {!excludeNwpDepartment && (
                                <MenuItem value={DEPARTMENT_OPTIONS.PRIMARY}>
                                    {primaryDepartmentName}
                                </MenuItem>
                            )}
                            <MenuItem value={DEPARTMENT_OPTIONS.OTHER}>Other</MenuItem>
                        </TextField>
                    </Grid>
                    {departmentType === DEPARTMENT_OPTIONS.OTHER && !departmentReadOnly && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Other Department Name"
                                name="otherDepartmentName"
                                value={otherDepartmentName}
                                required
                            />
                        </Grid>
                    )}
                    {departmentReadOnly && departmentType === DEPARTMENT_OPTIONS.OTHER && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Department"
                                name="otherDepartmentName"
                                value={otherDepartmentName}
                                disabled
                            />
                        </Grid>
                    )}
                </>
            )}
            {showNwpOfficeSelect && (
                <NwpOfficeSelect
                    district={district}
                    office={office}
                    onDistrictChange={onDistrictChange}
                    onOfficeChange={onOfficeChange}
                    districtLabelText={districtLabel}
                    officeLabel={officeLabel}
                />
            )}
            {showFreeTextOffice && (
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...fieldProps}
                        label={officeLabel}
                        name="office"
                        value={office}
                        onChange={(event) => onOfficeChange(event.target.value)}
                        disabled={officeReadOnly}
                        required
                        helperText={officeHelperText}
                        placeholder="e.g. Provincial Department Office"
                    />
                </Grid>
            )}
        </>
    );
}

export function ReadonlyWorkplaceFields({
    department,
    office,
    district,
    fromLabel = "Current Department",
    toLabel = "Current Office",
    districtLabel = "Working District"
}) {
    const parsed = parseDepartmentValue(department);
    const { fieldProps } = createFormFieldProps(() => {});

    return (
        <>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    {...fieldProps}
                    label={fromLabel}
                    value={department || "—"}
                    disabled
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    {...fieldProps}
                    label={toLabel}
                    value={office || "—"}
                    disabled
                />
            </Grid>
            {(
                parsed.departmentType === DEPARTMENT_OPTIONS.PRIMARY
                || parsed.departmentType === DEPARTMENT_OPTIONS.NWP
            ) && district && (
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                        {...fieldProps}
                        label={districtLabel}
                        value={district?.label ?? district ?? "—"}
                        disabled
                    />
                </Grid>
            )}
        </>
    );
}
