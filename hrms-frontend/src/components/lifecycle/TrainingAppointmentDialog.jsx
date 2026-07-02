import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    Alert
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import DateInput from "../DateInput";
import { timelineMinDateHelperText } from "../../utils/timelineDates";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    parseDepartmentValue,
    resolveDepartmentValue
} from "../workplace/DepartmentOfficeFields";
import { getServiceLevels } from "../../services/serviceLevelService";
import {
    isTrainingServiceLevel,
    getTrainingGraduationBlockReason,
    hasTrainingPeriodCompleted,
    validateDesignationAssignment
} from "../../constants/hrms";

const emptyWorkplace = () => ({
    departmentType: DEPARTMENT_OPTIONS.NWP,
    otherDepartmentName: "",
    district: "",
    office: ""
});

export default function TrainingAppointmentDialog({
    open,
    onClose,
    onSubmit,
    employee,
    previousEventDate,
    canAppoint = true
}) {
    const [form, setForm] = useState({
        appointmentDate: "",
        serviceLevelId: "",
        remarks: "",
        ...emptyWorkplace()
    });
    const [serviceLevels, setServiceLevels] = useState([]);

    const reportedDate = employee?.reportedDateToPresentWorkingPlace ?? null;
    const minimumDate = [previousEventDate, reportedDate]
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

    const permanentServiceLevels = useMemo(
        () => serviceLevels.filter((level) => !isTrainingServiceLevel(level)),
        [serviceLevels]
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        getServiceLevels()
            .then(setServiceLevels)
            .catch(() => setServiceLevels([]));

        const parsed = parseDepartmentValue(employee?.currentDepartment);
        const defaultServiceLevelId = employee?.designation?.serviceLevel?.id ?? "";

        setForm({
            appointmentDate: "",
            serviceLevelId: defaultServiceLevelId ? String(defaultServiceLevelId) : "",
            remarks: "",
            departmentType: parsed.departmentType,
            otherDepartmentName: parsed.otherDepartmentName,
            district: employee?.currentDistrictOfWorking?.label
                ?? employee?.currentDistrictOfWorking
                ?? "",
            office: employee?.currentOffice || ""
        });
    }, [open, employee]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const department = resolveDepartmentValue(
        form.departmentType,
        form.otherDepartmentName
    );

    const selectedServiceLevel = permanentServiceLevels.find(
        (level) => level.id === Number(form.serviceLevelId)
    );

    const validationEmployee = {
        employmentType: "PERMANENT",
        grade: "III",
        serviceLevel: selectedServiceLevel
    };

    const assignmentError = validateDesignationAssignment(
        validationEmployee,
        employee?.designation
    );

    const graduationBlockReason = getTrainingGraduationBlockReason(employee);
    const appointmentPeriodBlocked = Boolean(
        form.appointmentDate
        && employee
        && !hasTrainingPeriodCompleted(employee, form.appointmentDate)
    );

    const dateBeforeMinimum = Boolean(
        minimumDate
        && form.appointmentDate
        && form.appointmentDate < minimumDate
    );

    const submit = () => {
        onSubmit({
            appointmentDate: form.appointmentDate,
            serviceLevelId: Number(form.serviceLevelId),
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
        && !appointmentPeriodBlocked
        && form.serviceLevelId
        && !assignmentError
        && form.office.trim()
        && department
        && (form.departmentType !== DEPARTMENT_OPTIONS.OTHER
            || form.otherDepartmentName.trim())
        && (form.departmentType !== DEPARTMENT_OPTIONS.NWP || form.district)
        && canAppoint;

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
            <DialogTitle>Appoint as Permanent</DialogTitle>
            <DialogContent dividers>
                {!canAppoint && graduationBlockReason && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {graduationBlockReason}
                    </Alert>
                )}
                {canAppoint && appointmentPeriodBlocked && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        The selected effective date is before the training period
                        end date.
                    </Alert>
                )}
                <Alert severity="success" sx={{ mb: 2 }}>
                    {employee?.fullName} will be appointed as a permanent employee
                    on probation. The first appointment date will be set to the
                    effective date.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Effective Date"
                            name="appointmentDate"
                            value={form.appointmentDate}
                            required
                            slotProps={{
                                htmlInput: minimumDate
                                    ? { min: minimumDate }
                                    : undefined
                            }}
                            error={dateBeforeMinimum}
                            helperText={
                                dateBeforeMinimum
                                    ? timelineMinDateHelperText(
                                        minimumDate,
                                        { tooEarly: true }
                                    )
                                    : timelineMinDateHelperText(minimumDate)
                            }
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service Level"
                            name="serviceLevelId"
                            value={form.serviceLevelId}
                            required
                            error={Boolean(assignmentError)}
                            helperText={
                                assignmentError
                                || (employee?.designation?.serviceLevel?.levelName
                                    ? `Required: ${employee.designation.serviceLevel.levelName}`
                                    : undefined)
                            }
                        >
                            {permanentServiceLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.levelName}
                                </MenuItem>
                            ))}
                        </TextField>
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
