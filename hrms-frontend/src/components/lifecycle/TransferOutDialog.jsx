import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    Alert,
    Stack,
    Typography,
    Paper
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useState } from "react";
import { getDesignationsByService } from "../../services/designationService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps, dialogActionsSx } from "../../utils/formLayout";
import DateInput from "../DateInput";
import { timelineMinDateHelperText } from "../../utils/timelineDates";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    ReadonlyWorkplaceFields,
    resolveDepartmentValue
} from "../workplace/DepartmentOfficeFields";
import {
    isOtherDesignation,
    OTHER_DESIGNATION_VALUE,
    resolveEmployeeDesignationName,
    validateCustomDesignationAssignment,
    validateDesignationAssignment
} from "../../constants/hrms";

function ChangePreview({ label, fromValue, toValue }) {
    const changed = fromValue !== toValue;

    return (
        <Paper
            variant="outlined"
            sx={{
                px: 2,
                py: 1.25,
                borderRadius: 2,
                bgcolor: changed ? "primary.50" : "grey.50"
            }}
        >
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2">{fromValue || "—"}</Typography>
                {changed && (
                    <>
                        <ArrowForwardIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={600}>
                            {toValue || "—"}
                        </Typography>
                    </>
                )}
            </Stack>
        </Paper>
    );
}

const applyRequiredServiceLevel = (draft, designationId, designations) => {
    const designation = designations.find(
        (item) => item.id === Number(designationId)
    );

    if (!designation?.serviceLevel?.id) {
        return draft;
    }

    return {
        ...draft,
        serviceLevelId: String(designation.serviceLevel.id)
    };
};

const buildValidationEmployee = (employee, grade, serviceLevelId, serviceLevels) => ({
    ...employee,
    grade: grade ?? employee?.grade,
    serviceLevel: serviceLevels.find(
        (level) => level.id === Number(serviceLevelId)
    ) ?? employee?.serviceLevel
});

export default function TransferOutDialog({
    open,
    onClose,
    onSubmit,
    employee,
    employeeName,
    currentDepartment,
    currentOffice,
    currentDistrictOfWorking,
    previousEventDate
}) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [form, setForm] = useState({
        transferDate: "",
        newDesignationId: "",
        recordedDesignationName: "",
        serviceLevelId: "",
        toDepartmentType: DEPARTMENT_OPTIONS.NWP,
        toOtherDepartmentName: "",
        toDistrict: "",
        toOffice: "",
        remarks: ""
    });
    const [assignmentError, setAssignmentError] = useState("");

    const validateFormAssignment = (nextForm, designationData, levelData) => {
        if (!employee) {
            return "";
        }

        const validationEmployee = buildValidationEmployee(
            employee,
            employee.grade,
            nextForm.serviceLevelId,
            levelData
        );

        if (isOtherDesignation(nextForm.newDesignationId)) {
            if (!nextForm.recordedDesignationName?.trim()) {
                return "Designation title is required for Other";
            }
            return validateCustomDesignationAssignment({
                grade: employee.grade,
                serviceLevelId: nextForm.serviceLevelId
                    ? Number(nextForm.serviceLevelId)
                    : null,
                service: employee.designation?.service ?? employee.service
            }) || "";
        }

        if (!nextForm.newDesignationId) {
            return "Designation is required";
        }

        const designation = designationData.find(
            (item) => item.id === Number(nextForm.newDesignationId)
        );

        return validateDesignationAssignment(validationEmployee, designation) || "";
    };

    useEffect(() => {
        if (!open || !employee) {
            return;
        }

        const currentServiceId =
            employee.designation?.service?.id ?? employee.service?.id;
        if (!currentServiceId) {
            setDesignations([]);
            setAssignmentError("Current employee service is missing");
            return;
        }

        Promise.all([
            getDesignationsByService(currentServiceId),
            getServiceLevels()
        ]).then(([designationData, levelData]) => {
            setDesignations(designationData);
            setServiceLevels(levelData);

            const initialDesignationId = employee.recordedDesignationName
                ? OTHER_DESIGNATION_VALUE
                : String(employee.designation?.id ?? "");

            let initialForm = {
                transferDate: "",
                newDesignationId: initialDesignationId,
                recordedDesignationName: employee.recordedDesignationName ?? "",
                serviceLevelId: String(employee.serviceLevel?.id ?? ""),
                toDepartmentType: DEPARTMENT_OPTIONS.NWP,
                toOtherDepartmentName: "",
                toDistrict: "",
                toOffice: "",
                remarks: ""
            };

            if (!isOtherDesignation(initialDesignationId)) {
                initialForm = applyRequiredServiceLevel(
                    initialForm,
                    initialDesignationId,
                    designationData
                );
            }

            setForm(initialForm);
            setAssignmentError(
                validateFormAssignment(initialForm, designationData, levelData)
            );
        });
    }, [open, employee]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            let next = { ...prev, [name]: value };

            if (name === "newDesignationId") {
                if (isOtherDesignation(value)) {
                    next = {
                        ...next,
                        recordedDesignationName: ""
                    };
                } else {
                    next.recordedDesignationName = "";
                    next = applyRequiredServiceLevel(next, value, designations);
                }
            }

            setAssignmentError(validateFormAssignment(next, designations, serviceLevels));
            return next;
        });
    };

    const { fieldProps, selectFieldProps } = createFormFieldProps(handleChange);

    const isOtherTransfer = isOtherDesignation(form.newDesignationId);
    const selectedDesignation = isOtherTransfer
        ? null
        : designations.find(
            (item) => item.id === Number(form.newDesignationId)
        );
    const currentDesignationName = resolveEmployeeDesignationName(employee);
    const destinationDesignationName = isOtherTransfer
        ? form.recordedDesignationName?.trim() || null
        : selectedDesignation?.designationName ?? null;
    const currentServiceLevelName = employee?.serviceLevel?.levelName ?? null;
    const destinationServiceLevelName = serviceLevels.find(
        (level) => level.id === Number(form.serviceLevelId)
    )?.levelName ?? null;

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

    const assignmentReady = Boolean(form.serviceLevelId) && !assignmentError;

    const submit = () => {
        const payload = {
            transferDate: form.transferDate,
            toDepartment,
            toOffice: form.toOffice.trim(),
            toDistrict: form.toDepartmentType === DEPARTMENT_OPTIONS.NWP
                ? form.toDistrict
                : null,
            serviceLevelId: Number(form.serviceLevelId),
            remarks: form.remarks?.trim() || null
        };

        if (isOtherTransfer) {
            payload.recordedDesignationName = form.recordedDesignationName.trim();
        } else {
            payload.newDesignationId = Number(form.newDesignationId);
        }

        onSubmit(payload);
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
                    A paired transfer-in will be recorded automatically. Set the
                    designation and service level for the new department.
                    If this move is a <strong>promotion</strong> leaving N.W.P.
                    Engineering, use <strong>Promote / Update Assignment</strong>
                    instead and choose &quot;Transfers out of department&quot;.
                </Alert>
                <Grid container spacing={2}>
                    <ReadonlyWorkplaceFields
                        department={currentDepartment}
                        office={currentOffice}
                        district={currentDistrictOfWorking}
                    />
                    <Grid size={{ xs: 12 }}>
                        <DateInput
                            {...fieldProps}
                            label="Transfer Date"
                            name="transferDate"
                            value={form.transferDate}
                            required
                            slotProps={{
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
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Designation at new department"
                            name="newDesignationId"
                            value={form.newDesignationId}
                            required
                            error={Boolean(assignmentError)}
                            helperText={
                                assignmentError || "Same service; grade stays unchanged"
                            }
                        >
                            {designations.map((designation) => (
                                <MenuItem
                                    key={designation.id}
                                    value={designation.id}
                                >
                                    {designation.designationName}
                                    {designation.id === employee?.designation?.id
                                        ? " (current)"
                                        : ""}
                                </MenuItem>
                            ))}
                            <MenuItem value={OTHER_DESIGNATION_VALUE}>
                                Other (type historical title)
                            </MenuItem>
                        </TextField>
                    </Grid>
                    {isOtherTransfer && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Designation title (as recorded)"
                                name="recordedDesignationName"
                                value={form.recordedDesignationName}
                                required
                                error={Boolean(assignmentError)}
                            />
                        </Grid>
                    )}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            {...selectFieldProps}
                            label="Service Level"
                            name="serviceLevelId"
                            value={form.serviceLevelId}
                            required
                            error={Boolean(assignmentError)}
                            helperText={
                                selectedDesignation?.serviceLevel?.levelName
                                    ? `Required: ${selectedDesignation.serviceLevel.levelName}`
                                    : isOtherTransfer
                                        ? "Select the service level for the new post"
                                        : undefined
                            }
                        >
                            {serviceLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.levelName}
                                    {level.id === employee?.serviceLevel?.id
                                        ? " (current)"
                                        : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    {employee?.grade && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Grade / Class (unchanged)
                            </Typography>
                            <Typography variant="body2">{employee.grade}</Typography>
                        </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                        <ChangePreview
                            label="Designation"
                            fromValue={currentDesignationName}
                            toValue={destinationDesignationName}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <ChangePreview
                            label="Service Level"
                            fromValue={currentServiceLevelName}
                            toValue={destinationServiceLevelName}
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
                        || !assignmentReady
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
