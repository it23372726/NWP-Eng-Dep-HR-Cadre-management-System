import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    DialogActions,
    MenuItem,
    Grid,
    Alert,
    Chip,
    Stack,
    Checkbox,
    FormControlLabel
} from "@mui/material";

import { useEffect, useState } from "react";

import { getDesignations } from "../services/designationService";
import { getServiceLevels } from "../services/serviceLevelService";
import FormSection from "./FormSection";
import {
    createFormFieldProps,
    dialogActionsSx
} from "../utils/formLayout";
import {
    DISTRICTS,
    EMPLOYEE_ENTRY_TYPES,
    EMPLOYMENT_TYPES,
    GRADES,
    validateDesignationAssignment
} from "../constants/hrms";

const emptyForm = {
    entryType: "NEW_EMPLOYEE",
    transferredFrom: "",
    remarks: "",
    employeeNo: "",
    fullName: "",
    designationId: "",
    nic: "",
    dateOfBirth: "",
    gender: "",
    grade: "None",
    dateOfFirstAppointment: "",
    incremantDate: "",
    enteredDateToAllIslandService: "",
    reportedDateToPresentWorkingPlace: "",
    currentWorkingPlace: "",
    currentDistrictOfWorking: "",
    appointmentDateToPresentClassGrade: "",
    enteredDateToNWPCouncil: "",
    permanentAddress: "",
    residentDistrict: "",
    contactNo: "",
    serviceLevelId: "",
    employmentType: "PERMANENT",
    ebGrade3Passed: false,
    languageQualificationPassed: false,
    medicalReportCompleted: false,
    olApproved: false,
    alApproved: false,
    degreeApproved: false,
    otherQualificationName: "",
    otherQualificationApproved: false,
    birthCertificateApproved: false
};

function mapEmployeeToForm(employee) {
    if (!employee) {
        return emptyForm;
    }

    return {
        employeeNo: employee.employeeNo ?? "",
        fullName: employee.fullName ?? "",
        designationId: employee.designation?.id ?? "",
        nic: employee.nic ?? "",
        dateOfBirth: employee.dateOfBirth ?? "",
        gender: employee.gender ?? "",
        grade: employee.grade ?? "None",
        dateOfFirstAppointment: employee.dateOfFirstAppointment ?? "",
        incremantDate: employee.incremantDate ?? "",
        enteredDateToAllIslandService:
            employee.enteredDateToAllIslandService ?? "",
        reportedDateToPresentWorkingPlace:
            employee.reportedDateToPresentWorkingPlace ?? "",
        currentWorkingPlace: employee.currentWorkingPlace ?? "",
        currentDistrictOfWorking: employee.currentDistrictOfWorking ?? "",
        appointmentDateToPresentClassGrade:
            employee.appointmentDateToPresentClassGrade ?? "",
        enteredDateToNWPCouncil: employee.enteredDateToNWPCouncil ?? "",
        permanentAddress: employee.permanentAddress ?? "",
        residentDistrict: employee.residentDistrict ?? "",
        contactNo: employee.contactNo ?? "",
        serviceLevelId: employee.serviceLevel?.id ?? "",
        employmentType: employee.employmentType ?? "PERMANENT",
        ebGrade3Passed: Boolean(employee.ebGrade3Passed),
        languageQualificationPassed: Boolean(employee.languageQualificationPassed),
        medicalReportCompleted: Boolean(employee.medicalReportCompleted),
        olApproved: Boolean(employee.olApproved),
        alApproved: Boolean(employee.alApproved),
        degreeApproved: Boolean(employee.degreeApproved),
        otherQualificationName: employee.otherQualificationName ?? "",
        otherQualificationApproved: Boolean(employee.otherQualificationApproved),
        birthCertificateApproved: Boolean(employee.birthCertificateApproved)
    };
}

export default function EmployeeForm({
    open,
    handleClose,
    handleSubmit,
    selectedEmployee
}) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [assignmentError, setAssignmentError] = useState("");

    const isEdit = Boolean(selectedEmployee);

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        setFormData(mapEmployeeToForm(selectedEmployee));
        setAssignmentError("");
    }, [selectedEmployee, open]);

    const loadDropdowns = async () => {
        const [designationData, levelData] = await Promise.all([
            getDesignations(),
            getServiceLevels()
        ]);
        setDesignations(designationData);
        setServiceLevels(levelData);
    };

    const selectedDesignation = designations.find(
        (d) => d.id === Number(formData.designationId)
    );

    const validateAssignment = (nextFormData) => {
        const designation = designations.find(
            (d) => d.id === Number(nextFormData.designationId)
        );

        const error = validateDesignationAssignment(
            {
                grade: nextFormData.grade,
                employmentType: nextFormData.employmentType,
                serviceLevel: serviceLevels.find(
                    (l) => l.id === Number(nextFormData.serviceLevelId)
                )
            },
            designation
        );

        setAssignmentError(error || "");
        return error;
    };

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;
        const nextFormData = {
            ...formData,
            [name]: type === "checkbox" ? checked : value
        };

        if (name === "employmentType" && value !== "PERMANENT") {
            nextFormData.grade = "None";
        }

        setFormData(nextFormData);

        if (
            ["designationId", "grade", "serviceLevelId", "employmentType"].includes(name)
        ) {
            validateAssignment(nextFormData);
        }
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const submitForm = () => {
        const error = validateAssignment(formData);

        if (error) {
            return;
        }

        const payload = {
            ...formData,
            designationId: Number(formData.designationId),
            serviceLevelId: Number(formData.serviceLevelId),
            enteredDateToAllIslandService:
                formData.enteredDateToAllIslandService || null
        };

        if (isEdit) {
            const updatePayload = { ...payload };
            delete updatePayload.entryType;
            delete updatePayload.transferredFrom;
            delete updatePayload.remarks;
            handleSubmit(updatePayload);
            return;
        }

        if (
            formData.entryType === "TRANSFER_IN"
            && !formData.transferredFrom?.trim()
        ) {
            setAssignmentError(
                "Transferred from is required for transfer-in employees"
            );
            return;
        }

        handleSubmit({
            ...payload,
            entryType: formData.entryType,
            transferredFrom:
                formData.entryType === "TRANSFER_IN"
                    ? formData.transferredFrom.trim()
                    : null,
            remarks: formData.remarks?.trim() || null
        });
    };

    const isTransferIn = formData.entryType === "TRANSFER_IN";
    const showGradeField = formData.employmentType === "PERMANENT";
    const showQualificationSection =
        formData.employmentType === "PERMANENT" && formData.grade === "III";

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="lg"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {isEdit ? "Edit Employee" : "Add Employee"}
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    bgcolor: "grey.50",
                    px: { xs: 2, sm: 3 },
                    py: 2
                }}
            >
                {!isEdit && (
                    <FormSection
                        title="Employee entry"
                        description="How is this employee joining the department?"
                    >
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    {...selectFieldProps}
                                    label="Entry Type"
                                    name="entryType"
                                    value={formData.entryType}
                                >
                                    {EMPLOYEE_ENTRY_TYPES.map((type) => (
                                        <MenuItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {isTransferIn && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        {...fieldProps}
                                        label="Transferred From"
                                        name="transferredFrom"
                                        value={formData.transferredFrom}
                                        placeholder="e.g. Irrigation Department"
                                        required
                                    />
                                </Grid>
                            )}

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    {...fieldProps}
                                    label="Remarks (optional)"
                                    name="remarks"
                                    value={formData.remarks}
                                    multiline
                                    minRows={1}
                                />
                            </Grid>

                            {isTransferIn && (
                                <Grid size={{ xs: 12 }}>
                                    <Alert severity="info">
                                        Transfer-in keeps the same designation;
                                        only the working place is updated for
                                        N.W.P. Engineering Department.
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </FormSection>
                )}

                <FormSection
                    title="Identification"
                    description="Official employee number and national identity details."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="S/N"
                                name="employeeNo"
                                value={formData.employeeNo}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="NIC No"
                                name="nic"
                                value={formData.nic}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="Contact No"
                                name="contactNo"
                                value={formData.contactNo}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Full Name"
                                name="fullName"
                                value={formData.fullName}
                            />
                        </Grid>
                    </Grid>
                </FormSection>

                <FormSection
                    title="Personal information"
                    description="Basic personal details."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="Date of Birth"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Gender"
                                name="gender"
                                value={formData.gender}
                            >
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="Resident District"
                                name="residentDistrict"
                                value={formData.residentDistrict}
                                placeholder="e.g. Kurunegala, Puttalam"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                {...fieldProps}
                                label="Permanent Address"
                                name="permanentAddress"
                                value={formData.permanentAddress}
                                multiline
                                minRows={2}
                            />
                        </Grid>
                    </Grid>
                </FormSection>

                <FormSection
                    title="Position & classification"
                    description="Designation, grade, and service level must match cadre rules."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Designation"
                                name="designationId"
                                value={formData.designationId}
                            >
                                {designations.map((designation) => (
                                    <MenuItem
                                        key={designation.id}
                                        value={designation.id}
                                    >
                                        {designation.designationName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Employment Type"
                                name="employmentType"
                                value={formData.employmentType}
                            >
                                {EMPLOYMENT_TYPES.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        {showGradeField && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    label="Grade / Class"
                                    name="grade"
                                    value={formData.grade}
                                >
                                    {GRADES.map((grade) => (
                                        <MenuItem key={grade} value={grade}>
                                            {grade}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Service Level"
                                name="serviceLevelId"
                                value={formData.serviceLevelId}
                            >
                                {serviceLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.levelName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                    </Grid>

                    {selectedDesignation && (
                        <Stack
                            direction="row"
                            gap={1}
                            sx={{ mt: 2, flexWrap: "wrap" }}
                        >
                            {selectedDesignation.service && (
                                <Chip
                                    size="small"
                                    label={`Service: ${selectedDesignation.service.serviceCode}`}
                                    variant="outlined"
                                />
                            )}
                            {selectedDesignation.serviceLevel && (
                                <Chip
                                    size="small"
                                    label={`Required level: ${selectedDesignation.serviceLevel.levelName}`}
                                    variant="outlined"
                                />
                            )}
                            {(selectedDesignation.allowedGrades || []).length > 0 && (
                                <Chip
                                    size="small"
                                    label={`Allowed grades: ${selectedDesignation.allowedGrades.join(", ")}`}
                                    variant="outlined"
                                />
                            )}
                        </Stack>
                    )}

                    {assignmentError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {assignmentError}
                        </Alert>
                    )}
                </FormSection>

                {showQualificationSection && (
                    <FormSection
                        title="Permanent Qualification Requirements"
                        description="Grade III permanency requirements and certificate approvals."
                    >
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="ebGrade3Passed"
                                            checked={formData.ebGrade3Passed}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="EB Grade III Passed"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="languageQualificationPassed"
                                            checked={formData.languageQualificationPassed}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Government Language Qualification Passed"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="medicalReportCompleted"
                                            checked={formData.medicalReportCompleted}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Medical Report Completed"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="olApproved"
                                            checked={formData.olApproved}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="O/L Approved"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="alApproved"
                                            checked={formData.alApproved}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="A/L Approved"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="degreeApproved"
                                            checked={formData.degreeApproved}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Degree Approved"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <TextField
                                    {...fieldProps}
                                    label="Other Qualification Name"
                                    name="otherQualificationName"
                                    value={formData.otherQualificationName}
                                    placeholder="Optional qualification"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="otherQualificationApproved"
                                            checked={formData.otherQualificationApproved}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Other Qualification Approved"
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="birthCertificateApproved"
                                            checked={formData.birthCertificateApproved}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Birth Certificate Approved"
                                />
                            </Grid>
                        </Grid>
                    </FormSection>
                )}

                <FormSection
                    title="Appointment & service dates"
                    description="Chronological service and appointment milestones."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="First Appointment"
                                name="dateOfFirstAppointment"
                                value={formData.dateOfFirstAppointment}
                                helperText="Date of first appointment"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...fieldProps}
                                label="Incremant Date"
                                name="incremantDate"
                                value={formData.incremantDate}
                                placeholder="e.g. 02-Jul"
                                helperText="Month-Day only (e.g., 02-Jul)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="All Island Service"
                                name="enteredDateToAllIslandService"
                                value={formData.enteredDateToAllIslandService}
                                helperText="Optional"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="N.W.P. Council"
                                name="enteredDateToNWPCouncil"
                                value={formData.enteredDateToNWPCouncil}
                                helperText="Entered date to council"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="Present Class / Grade"
                                name="appointmentDateToPresentClassGrade"
                                value={formData.appointmentDateToPresentClassGrade}
                                helperText="Appointment to current class"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                {...dateFieldProps}
                                label="Reported to Workplace"
                                name="reportedDateToPresentWorkingPlace"
                                value={formData.reportedDateToPresentWorkingPlace}
                                helperText="Reported to present place"
                            />
                        </Grid>
                    </Grid>
                </FormSection>

                <FormSection
                    title="Current workplace"
                    description="Where the employee is presently stationed."
                >
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                {...fieldProps}
                                label="Current Working Place"
                                name="currentWorkingPlace"
                                value={formData.currentWorkingPlace}
                                placeholder="Office / station name"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                label="Working District"
                                name="currentDistrictOfWorking"
                                value={formData.currentDistrictOfWorking}
                            >
                                {DISTRICTS.map((district) => (
                                    <MenuItem key={district} value={district}>
                                        {district}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </FormSection>
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={submitForm}
                    disabled={Boolean(assignmentError)}
                >
                    {isEdit ? "Save Changes" : "Add Employee"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
