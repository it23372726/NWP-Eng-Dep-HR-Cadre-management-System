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
    parseDepartmentValue,
    resolveDepartmentValue
} from "../workplace/DepartmentOfficeFields";

const emptyWorkplace = () => ({
    departmentType: DEPARTMENT_OPTIONS.NWP,
    otherDepartmentName: "",
    district: "",
    office: ""
});

export default function NewAppointmentDialog({
    open,
    onClose,
    onSubmit,
    employeeName,
    defaultDepartment,
    defaultOffice,
    defaultDistrict,
    previousEventDate
}) {
    const [form, setForm] = useState({
        appointmentDate: "",
        remarks: "",
        ...emptyWorkplace()
    });

    useEffect(() => {
        if (open) {
            const parsed = parseDepartmentValue(defaultDepartment);
            setForm({
                appointmentDate: "",
                remarks: "",
                departmentType: parsed.departmentType,
                otherDepartmentName: parsed.otherDepartmentName,
                district: defaultDistrict?.label ?? defaultDistrict ?? "",
                office: defaultOffice || ""
            });
        }
    }, [open, defaultDepartment, defaultOffice, defaultDistrict]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, dateFieldProps } = createFormFieldProps(handleChange);

    const department = resolveDepartmentValue(
        form.departmentType,
        form.otherDepartmentName
    );

    const dateBeforeMinimum = Boolean(
        previousEventDate
        && form.appointmentDate
        && form.appointmentDate < previousEventDate
    );

    const submit = () => {
        onSubmit({
            appointmentDate: form.appointmentDate,
            department,
            office: form.office.trim(),
            district: form.departmentType === DEPARTMENT_OPTIONS.NWP
                ? form.district
                : null,
            remarks: form.remarks?.trim() || null
        });
    };

    const valid = form.appointmentDate
        && !dateBeforeMinimum
        && form.office.trim()
        && department
        && (form.departmentType !== DEPARTMENT_OPTIONS.OTHER
            || form.otherDepartmentName.trim())
        && (form.departmentType !== DEPARTMENT_OPTIONS.NWP || form.district);

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
            <DialogTitle>New Appointment</DialogTitle>
            <DialogContent dividers>
                <Alert severity="success" sx={{ mb: 2 }}>
                    {employeeName} will be newly appointed. Employee becomes active.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...dateFieldProps}
                            label="Appointment Date"
                            name="appointmentDate"
                            value={form.appointmentDate}
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
                        departmentType={form.departmentType}
                        otherDepartmentName={form.otherDepartmentName}
                        district={form.district}
                        office={form.office}
                        onDepartmentTypeChange={(value) =>
                            setForm((prev) => ({
                                ...prev,
                                departmentType: value,
                                district: "",
                                office: ""
                            }))
                        }
                        onOtherDepartmentNameChange={(value) =>
                            setForm((prev) => ({ ...prev, otherDepartmentName: value }))
                        }
                        onDistrictChange={(value) =>
                            setForm((prev) => ({ ...prev, district: value, office: "" }))
                        }
                        onOfficeChange={(value) =>
                            setForm((prev) => ({ ...prev, office: value }))
                        }
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
                    color="success"
                    onClick={submit}
                    disabled={!valid}
                >
                    Confirm Appointment
                </Button>
            </DialogActions>
        </Dialog>
    );
}
