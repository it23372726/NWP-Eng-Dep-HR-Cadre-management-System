import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert
} from "@mui/material";
import { useEffect, useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import { timelineMinDateHelperText } from "../../utils/timelineDates";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    ReadonlyWorkplaceFields,
    resolveDepartmentValue
} from "../workplace/DepartmentOfficeFields";

export default function TransferOutDialog({
    open,
    onClose,
    onSubmit,
    employeeName,
    currentDepartment,
    currentOffice,
    currentDistrictOfWorking,
    previousEventDate
}) {
    const [form, setForm] = useState({
        transferDate: "",
        toDepartmentType: DEPARTMENT_OPTIONS.NWP,
        toOtherDepartmentName: "",
        toDistrict: "",
        toOffice: "",
        remarks: ""
    });

    useEffect(() => {
        if (open) {
            setForm({
                transferDate: "",
                toDepartmentType: DEPARTMENT_OPTIONS.NWP,
                toOtherDepartmentName: "",
                toDistrict: "",
                toOffice: "",
                remarks: ""
            });
        }
    }, [open]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const toDepartment = resolveDepartmentValue(
        form.toDepartmentType,
        form.toOtherDepartmentName
    );

    const sameDepartment = currentDepartment
        && toDepartment
        && currentDepartment.toLowerCase() === toDepartment.toLowerCase();

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && form.transferDate
        && form.transferDate < previousEventDate
    );

    const submit = () => {
        onSubmit({
            transferDate: form.transferDate,
            toDepartment,
            toOffice: form.toOffice.trim(),
            toDistrict: form.toDepartmentType === DEPARTMENT_OPTIONS.NWP
                ? form.toDistrict
                : null,
            remarks: form.remarks?.trim() || null
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle>Transfer Out</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {employeeName} will transfer out from their current department.
                    A paired transfer-in will be recorded automatically. The employee
                    stays active and their designation stays unchanged.
                </Alert>
                <Grid container spacing={2}>
                    <ReadonlyWorkplaceFields
                        department={currentDepartment}
                        office={currentOffice}
                        district={currentDistrictOfWorking}
                    />
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Transfer Date"
                            name="transferDate"
                            value={form.transferDate}
                            required
                            slotProps={{
                                ...dateFieldProps.slotProps,
                                htmlInput: previousEventDate
                                    ? { min: previousEventDate }
                                    : undefined
                            }}
                            error={dateBeforeMinimum}
                            helperText={
                                dateBeforeMinimum
                                    ? timelineMinDateHelperText(
                                        previousEventDate,
                                        { tooEarly: true }
                                    )
                                    : timelineMinDateHelperText(previousEventDate)
                            }
                        />
                    </Grid>
                    <DepartmentOfficeFields
                        departmentType={form.toDepartmentType}
                        otherDepartmentName={form.toOtherDepartmentName}
                        district={form.toDistrict}
                        office={form.toOffice}
                        onDepartmentTypeChange={(value) =>
                            setForm((prev) => ({
                                ...prev,
                                toDepartmentType: value,
                                toDistrict: "",
                                toOffice: ""
                            }))
                        }
                        onOtherDepartmentNameChange={(value) =>
                            setForm((prev) => ({ ...prev, toOtherDepartmentName: value }))
                        }
                        onDistrictChange={(value) =>
                            setForm((prev) => ({ ...prev, toDistrict: value, toOffice: "" }))
                        }
                        onOfficeChange={(value) =>
                            setForm((prev) => ({ ...prev, toOffice: value }))
                        }
                        departmentLabel="Transfer To — Department"
                        officeLabel="Transfer To — Office"
                    />
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...fieldProps}
                            label="Remarks"
                            name="remarks"
                            value={form.remarks}
                            multiline
                            minRows={2}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={submit}
                    disabled={
                        !form.transferDate
                        || dateBeforeMinimum
                        || !form.toOffice.trim()
                        || !toDepartment
                        || (form.toDepartmentType === DEPARTMENT_OPTIONS.OTHER
                            && !form.toOtherDepartmentName.trim())
                        || (form.toDepartmentType === DEPARTMENT_OPTIONS.NWP
                            && !form.toDistrict)
                        || sameDepartment
                    }
                >
                    Confirm Transfer Out
                </Button>
            </DialogActions>
        </Dialog>
    );
}
