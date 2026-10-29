import { useEffect, useState } from "react";
import { Alert, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import DateInput from "../DateInput";
import DepartmentOfficeFields, { parseDepartmentValue, resolveDepartmentValue } from "../workplace/DepartmentOfficeFields";
import { getDesignations } from "../../services/designationService";
import { getApiErrorMessage, isPrimaryDepartment } from "../../constants/hrms";
import { getPermanentConfirmationMinDate, getServiceAppointmentProbationYears } from "../../utils/gradeAchievementDates";
import {
    formatTimelineDate,
    minIsoDate,
    timelineMinDateHelperText,
    todayIsoDate
} from "../../utils/timelineDates";

export default function ServiceAppointmentDialog({ open, onClose, onSubmit, employee, initialAction, previousEventDate, nextEventDate, maxDate = null, maxDateHelperText = null }) {
    const [form, setForm] = useState(null);
    const [designations, setDesignations] = useState([]);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const source = initialAction || {};
        const sourceDepartment = source.fromDepartment || employee?.currentDepartment || "";
        setForm({
            sourceDepartment,
            outcome: source.department && source.department !== sourceDepartment ? "transfer" : "stay",
            newDesignationId: String(source.newDesignationId || source.designationId || ""),
            serviceId: String(source.serviceId || ""),
            appointmentDate: source.actionDate || "",
            appointmentBasis: source.appointmentBasis || "",
            firstIncrementDueDate: source.firstIncrementDueDate || "",
            ...parseDepartmentValue(source.department || employee?.currentDepartment || ""),
            office: source.office || employee?.currentOffice || "",
            district: source.district || employee?.currentDistrictOfWorking?.label || employee?.currentDistrictOfWorking || "",
            remarks: source.remarks || "",
            serviceAppointmentKey: source.serviceAppointmentKey || crypto.randomUUID()
        });
        setError("");
        getDesignations().then(data => { if (!cancelled) setDesignations(data); })
            .catch(e => { if (!cancelled) setError(getApiErrorMessage(e)); });
        return () => { cancelled = true; };
    }, [open, initialAction, employee]);
    if (!form) return null;
    const priorServiceId = employee?.designation?.service?.id ?? employee?.service?.id;
    const eligible = designations.filter(d => d.service?.id && d.service.id !== Number(priorServiceId)
        && d.allowedGrades?.includes("III") && d.service.allowedGrades?.includes("III") && d.serviceLevel?.id);
    const services = [...new Map(eligible.map(d => [d.service.id, d.service])).values()];
    const target = eligible.find(d => d.id === Number(form.newDesignationId));
    const chosenService = form.serviceId || String(target?.service?.id || "");
    const serviceOptions = services.filter(s => String(s.id) === chosenService);
    const designationOptions = eligible.filter(d => d.service.id === Number(chosenService));
    // Until the catalogue loads, or when a recorded designation is no longer offered, keep the
    // select value empty rather than rendering an option that does not exist.
    const serviceValue = serviceOptions.length ? chosenService : "";
    const designationValue = designationOptions.some(d => String(d.id) === form.newDesignationId)
        ? form.newDesignationId : "";
    const unavailableSelection = designations.length > 0 && form.newDesignationId && !designationValue;
    const department = form.outcome === "stay" ? form.sourceDepartment : resolveDepartmentValue(form.departmentType, form.otherDepartmentName);
    const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
    const probationYears = getServiceAppointmentProbationYears(employee, form.appointmentDate);
    const probationEnd = getPermanentConfirmationMinDate(form.appointmentDate, probationYears);

    const today = todayIsoDate();
    const keepsRecordedDate = Boolean(
        initialAction?.actionDate
        && form.appointmentDate === initialAction.actionDate
    );
    const latestAllowedDate = keepsRecordedDate
        ? null
        : minIsoDate(maxDate, minIsoDate(nextEventDate, today));
    const dateTooEarly = Boolean(!keepsRecordedDate && previousEventDate && form.appointmentDate
        && form.appointmentDate < previousEventDate);
    const dateTooLate = Boolean(!keepsRecordedDate && latestAllowedDate
        && form.appointmentDate && form.appointmentDate > latestAllowedDate);
    const dueBeforeAppointment = Boolean(form.firstIncrementDueDate && form.appointmentDate
        && form.firstIncrementDueDate < form.appointmentDate);
    const tooLateMessage = maxDateHelperText
        || (nextEventDate && latestAllowedDate === nextEventDate
            ? `Cannot be later than the next recorded event (${formatTimelineDate(nextEventDate)}).`
            : `Cannot be later than today (${formatTimelineDate(today)}).`);
    const appointmentDateHelper = dateTooEarly
        ? timelineMinDateHelperText(previousEventDate, { tooEarly: true })
        : dateTooLate ? tooLateMessage
            : timelineMinDateHelperText(previousEventDate) ?? tooLateMessage;
    const dateBlocked = !form.appointmentDate || dateTooEarly || dateTooLate || dueBeforeAppointment;

    const submit = async () => {
        if (!target) return setError("Select a Grade III designation in another service.");
        if (!form.appointmentDate) return setError("Enter the appointment effective date.");
        if (dateTooEarly) return setError(timelineMinDateHelperText(previousEventDate, { tooEarly: true }));
        if (dateTooLate) return setError(`Appointment effective date: ${tooLateMessage}`);
        if (!form.appointmentBasis.trim())
            return setError("Enter the examination or other basis stated in the appointment letter.");
        if (!form.firstIncrementDueDate || dueBeforeAppointment)
            return setError("Enter the first increment due date from the appointment letter. It cannot precede the appointment.");
        if (!department || !form.office.trim() || (isPrimaryDepartment(department) && !form.district))
            return setError("Complete the department, office and working district.");
        if (form.outcome === "transfer" && department.trim().toLowerCase() === form.sourceDepartment.trim().toLowerCase())
            return setError("Choose another department, or select Stay in current department.");
        setSaving(true); setError("");
        try {
            await onSubmit({
                expectedHistoryRevision: employee?.lifecycleHistoryRevision,
                fromDepartment: form.sourceDepartment,
                fromOffice: initialAction?.fromOffice || employee?.currentOffice || "",
                newDesignationId: target.id, serviceLevelId: target.serviceLevel.id, serviceId: target.service.id,
                appointmentDate: form.appointmentDate, grade: "III", appointmentBasis: form.appointmentBasis.trim(),
                // The annual increment day is the month and day of the first due date from the letter.
                incrementDate: form.firstIncrementDueDate.slice(5),
                firstIncrementDueDate: form.firstIncrementDueDate, department, office: form.office.trim(),
                district: isPrimaryDepartment(department) ? form.district : null,
                remarks: form.remarks.trim() || null, serviceAppointmentKey: form.serviceAppointmentKey
            });
            onClose();
        } catch (e) { setError(getApiErrorMessage(e)); }
        finally { setSaving(false); }
    };
    return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
        <DialogTitle>{initialAction ? "Revise appointment to another service" : "Appointment to Another Service"}</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={2}>
                <Alert severity="info">The employee starts at Grade III with a {probationYears}-year probation. A previously completed and confirmed three-year probation qualifies for one year in the new service. Previous service history and recorded increments are preserved.</Alert>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth size="small" label="New service" value={serviceValue}
                        onChange={e => setForm(p => ({ ...p, serviceId: e.target.value, newDesignationId: "" }))}>
                        {services.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.serviceCode} — {s.description}</MenuItem>)}
                    </TextField></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth size="small" label="New designation" value={designationValue}
                        onChange={e => set("newDesignationId", e.target.value)} disabled={!serviceValue}>
                        {designationOptions.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.designationName}</MenuItem>)}
                    </TextField></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><DateInput label="Appointment effective date" value={form.appointmentDate}
                        required error={dateTooEarly || dateTooLate} helperText={appointmentDateHelper}
                        slotProps={{ htmlInput: { min: previousEventDate || undefined, max: latestAllowedDate } }}
                        onChange={e => set("appointmentDate", e.target.value)} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Entry grade / service level" value={`Grade III / ${target?.serviceLevel?.levelName || "Select designation"}`} slotProps={{ input: { readOnly: true } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Examination passed"
                        placeholder="e.g. Limited competitive examination for MSO" value={form.appointmentBasis}
                        helperText="The examination or other basis stated in the appointment letter"
                        onChange={e => set("appointmentBasis", e.target.value)} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><DateInput label="First increment due date" value={form.firstIncrementDueDate}
                        required error={dueBeforeAppointment}
                        slotProps={{ htmlInput: { min: form.appointmentDate || undefined } }}
                        helperText={dueBeforeAppointment
                            ? `Cannot be earlier than the appointment (${formatTimelineDate(form.appointmentDate)}).`
                            : form.firstIncrementDueDate
                                ? `Annual increment falls on ${form.firstIncrementDueDate.slice(5)} from now on`
                                : "From the appointment letter; sets the annual increment day"}
                        onChange={e => set("firstIncrementDueDate", e.target.value)} /></Grid>
                    <Grid size={12}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Appointment outcome</FormLabel>
                            <RadioGroup value={form.outcome} onChange={e => {
                                const outcome = e.target.value;
                                setForm(p => ({ ...p, outcome,
                                    ...parseDepartmentValue(outcome === "stay" ? p.sourceDepartment : ""),
                                    office: outcome === "stay" ? (initialAction?.fromOffice || employee?.currentOffice || "") : "",
                                    district: outcome === "stay" ? (employee?.currentDistrictOfWorking?.label || employee?.currentDistrictOfWorking || "") : ""
                                }));
                            }}>
                                <FormControlLabel value="stay" control={<Radio />} label={`Stay in ${form.sourceDepartment} and appoint to another service`} />
                                <FormControlLabel value="transfer" control={<Radio />} label="Transfer to another department and appoint to another service" />
                            </RadioGroup>
                        </FormControl>
                        <Alert severity="info" sx={{ mt: 1 }}>
                            {isPrimaryDepartment(form.sourceDepartment)
                                ? form.outcome === "stay"
                                    ? "Cadre report: Service Appointment OUT on the old designation and Service Appointment IN on the new designation."
                                    : "Cadre report: Service Appointment OUT and Transfer Out on the old designation."
                                : form.outcome === "transfer" && isPrimaryDepartment(department)
                                    ? "Cadre report: Transfer In on the new designation only."
                                    : "This appointment does not affect the main department cadre report."}
                        </Alert>
                    </Grid>
                    <DepartmentOfficeFields departmentReadOnly={form.outcome === "stay"} departmentType={form.departmentType} otherDepartmentName={form.otherDepartmentName || ""}
                        district={form.district} office={form.office}
                        onDepartmentTypeChange={v => setForm(p => ({ ...p, departmentType: v, district: "", office: "" }))}
                        onOtherDepartmentNameChange={v => set("otherDepartmentName", v)} onDistrictChange={v => setForm(p => ({ ...p, district: v, office: "" }))}
                        onOfficeChange={v => set("office", v)} />
                    <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Remarks" value={form.remarks} onChange={e => set("remarks", e.target.value)} /></Grid>
                </Grid>
                {target && <Alert severity="warning"><Typography variant="body2">
                    {employee?.designation?.designationName || employee?.recordedDesignationName || "Previous appointment"} → {target.designationName} ({target.service.serviceCode}).
                    {probationEnd && ` Earliest confirmation: ${probationEnd}, after requirements are completed.`}
                </Typography></Alert>}
                {unavailableSelection && <Alert severity="warning">
                    The recorded designation is no longer offered as a Grade III entry in another service.
                    Select the designation again, or correct the designation catalogue first.
                </Alert>}
                {error && <Alert severity="error">{error}</Alert>}
            </Stack>
        </DialogContent>
        <DialogActions><Button disabled={saving} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={saving || dateBlocked} onClick={submit}>{saving ? "Saving…" : initialAction ? "Save revision" : "Record appointment"}</Button></DialogActions>
    </Dialog>;
}
