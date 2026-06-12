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
    FIXED_GRADE1_REQUIREMENTS,
    FIXED_GRADE2_REQUIREMENTS,
    FIXED_PERMANENT_REQUIREMENTS,
    GRADES,
    isRequirementCompleted,
    REQUIREMENT_STATUS,
    validateDesignationAssignment
} from "../constants/hrms";

const completedStatus = (checked) =>
    checked ? REQUIREMENT_STATUS.COMPLETED : REQUIREMENT_STATUS.PENDING;

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
    birthCertificateApproved: false,
    alreadyConfirmedPermanent: false,
    permanentConfirmationDate: "",
    ebGrade2Passed: false,
    ebGrade1Passed: false,
    otherGrade2RequirementCompleted: false,
    grade2RequiredYears: "",
    grade1RequiredYears: ""
};

const appendCustomRequirementFields = (form, employee, designation) => {
    (designation?.permanentRequirements || []).forEach((requirement) => {
        const key = requirementKey(
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        );
        form[key] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        );
    });

    (designation?.grade2Requirements || []).forEach((requirement) => {
        const key = requirementKey(
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        );
        form[key] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_GRADE_2_REQUIREMENT",
            requirement.requirementName
        );
    });

    (designation?.grade1Requirements || []).forEach((requirement) => {
        const key = requirementKey(
            "CUSTOM_GRADE_1_REQUIREMENT",
            requirement.requirementName
        );
        form[key] = isNamedRequirementCompleted(
            employee,
            "CUSTOM_GRADE_1_REQUIREMENT",
            requirement.requirementName
        );
    });
};

function mapEmployeeToForm(employee) {
    if (!employee) {
        return emptyForm;
    }
    const careerProgression = employee.careerProgression || {};

    const form = {
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
        ebGrade3Passed: isRequirementCompleted(employee, "EB_GRADE_3"),
        languageQualificationPassed: isRequirementCompleted(
            employee,
            "GOVERNMENT_LANGUAGE_QUALIFICATION"
        ),
        medicalReportCompleted: isRequirementCompleted(employee, "MEDICAL_REPORT"),
        olApproved: isRequirementCompleted(employee, "OL_CERTIFICATE"),
        alApproved: isRequirementCompleted(employee, "AL_CERTIFICATE"),
        degreeApproved: isRequirementCompleted(employee, "DEGREE_CERTIFICATE"),
        birthCertificateApproved: isRequirementCompleted(
            employee,
            "BIRTH_CERTIFICATE"
        ),
        alreadyConfirmedPermanent: Boolean(
            careerProgression.permanentConfirmationDate
        ),
        permanentConfirmationDate:
            careerProgression.permanentConfirmationDate ?? "",
        ebGrade2Passed: isRequirementCompleted(employee, "EB_GRADE_2"),
        ebGrade1Passed: isRequirementCompleted(employee, "EB_GRADE_1"),
        otherGrade2RequirementCompleted: isRequirementCompleted(
            employee,
            "OTHER_GRADE_2_REQUIREMENT"
        ),
        grade2RequiredYears: careerProgression.grade2RequiredYears ?? "",
        grade1RequiredYears: careerProgression.grade1RequiredYears ?? ""
    };

    appendCustomRequirementFields(form, employee, employee.designation);
    return form;
}

const formatDisplayDate = (date) => {
    if (!date) return "—";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
};

const requirementKey = (type, name) => `${type}:${name}`;

const FIXED_REQUIREMENT_FIELD_NAMES = {
    EB_GRADE_3: "ebGrade3Passed",
    GOVERNMENT_LANGUAGE_QUALIFICATION: "languageQualificationPassed",
    MEDICAL_REPORT: "medicalReportCompleted",
    OL_CERTIFICATE: "olApproved",
    AL_CERTIFICATE: "alApproved",
    DEGREE_CERTIFICATE: "degreeApproved",
    BIRTH_CERTIFICATE: "birthCertificateApproved",
    EB_GRADE_2: "ebGrade2Passed",
    EB_GRADE_1: "ebGrade1Passed"
};

const renderFixedRequirementCheckboxes = (
    fixedRequirements,
    formData,
    handleChange
) =>
    fixedRequirements.map(({ requirementType, label }) => {
        const fieldName = FIXED_REQUIREMENT_FIELD_NAMES[requirementType];
        if (!fieldName) {
            return null;
        }

        return (
            <Grid key={requirementType} size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={fieldName}
                            checked={Boolean(formData[fieldName])}
                            onChange={handleChange}
                        />
                    }
                    label={label}
                />
            </Grid>
        );
    });

const renderCustomRequirementCheckboxes = (
    requirementType,
    designationRequirements,
    formData,
    employee,
    handleChange
) =>
    (designationRequirements || []).map((requirement) => {
        const key = requirementKey(
            requirementType,
            requirement.requirementName
        );
        const checked = formData[key] ?? isNamedRequirementCompleted(
            employee,
            requirementType,
            requirement.requirementName
        );

        return (
            <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={key}
                            checked={Boolean(checked)}
                            onChange={handleChange}
                        />
                    }
                    label={requirement.requirementName}
                />
            </Grid>
        );
    });

const isNamedRequirementCompleted = (employee, type, name) =>
    (employee?.requirements || []).some(
        (requirement) =>
            requirement.requirementType === type
            && requirement.status === "COMPLETED"
            && (requirement.requirementName || "").toLowerCase()
                === name.toLowerCase()
    );

const buildRequirements = (formData, designation, employee) => {
    const requirements = [
        {
            requirementType: "EB_GRADE_3",
            status: completedStatus(formData.ebGrade3Passed)
        },
        {
            requirementType: "GOVERNMENT_LANGUAGE_QUALIFICATION",
            status: completedStatus(formData.languageQualificationPassed)
        },
        {
            requirementType: "MEDICAL_REPORT",
            status: completedStatus(formData.medicalReportCompleted)
        },
        {
            requirementType: "OL_CERTIFICATE",
            status: completedStatus(formData.olApproved)
        },
        {
            requirementType: "AL_CERTIFICATE",
            status: completedStatus(formData.alApproved)
        },
        {
            requirementType: "DEGREE_CERTIFICATE",
            status: completedStatus(formData.degreeApproved)
        },
        {
            requirementType: "BIRTH_CERTIFICATE",
            status: completedStatus(formData.birthCertificateApproved)
        },
        {
            requirementType: "EB_GRADE_2",
            status: completedStatus(formData.ebGrade2Passed)
        },
        {
            requirementType: "EB_GRADE_1",
            status: completedStatus(formData.ebGrade1Passed)
        }
    ];

    const appendCustomRequirements = (type, designationRequirements) => {
        (designationRequirements || []).forEach((requirement) => {
            const key = requirementKey(type, requirement.requirementName);
            const checked = formData[key] ?? isNamedRequirementCompleted(
                employee,
                type,
                requirement.requirementName
            );
            requirements.push({
                requirementType: type,
                requirementName: requirement.requirementName,
                status: completedStatus(checked)
            });
        });
    };

    appendCustomRequirements(
        "CUSTOM_PERMANENT_REQUIREMENT",
        designation?.permanentRequirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_2_REQUIREMENT",
        designation?.grade2Requirements
    );
    appendCustomRequirements(
        "CUSTOM_GRADE_1_REQUIREMENT",
        designation?.grade1Requirements
    );

    return requirements;
};

const buildEmployeePayload = (
    formData,
    designation,
    employee,
    {
        showPermanentConfirmationSection,
        showQualificationSection
    }
) => ({
    employeeNo: formData.employeeNo,
    fullName: formData.fullName,
    designationId: Number(formData.designationId),
    nic: formData.nic,
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    grade: formData.grade,
    dateOfFirstAppointment: formData.dateOfFirstAppointment,
    incremantDate: formData.incremantDate || null,
    enteredDateToAllIslandService:
        formData.enteredDateToAllIslandService || null,
    reportedDateToPresentWorkingPlace:
        formData.reportedDateToPresentWorkingPlace,
    currentWorkingPlace: formData.currentWorkingPlace,
    currentDistrictOfWorking: formData.currentDistrictOfWorking,
    appointmentDateToPresentClassGrade:
        showPermanentConfirmationSection
            ? formData.permanentConfirmationDate || null
            : showQualificationSection
                ? null
                : formData.appointmentDateToPresentClassGrade || null,
    enteredDateToNWPCouncil: formData.enteredDateToNWPCouncil,
    permanentAddress: formData.permanentAddress,
    residentDistrict: formData.residentDistrict || null,
    contactNo: formData.contactNo,
    serviceLevelId: Number(formData.serviceLevelId),
    employmentType: formData.employmentType,
    alreadyConfirmedPermanent: formData.alreadyConfirmedPermanent,
    permanentConfirmationDate: formData.permanentConfirmationDate || null,
    grade2RequiredYears: null,
    grade1RequiredYears: null,
    requirements: buildRequirements(formData, designation, employee)
});

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
        if (open) {
            loadDropdowns();
        }
    }, [open]);

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

        const isPermanent = nextFormData.employmentType === "PERMANENT";
        const gradeImpliesPermanent =
            isPermanent
            && ["II", "I", "Supra", "Special"].includes(nextFormData.grade);
        const gradeThreeAlreadyConfirmed =
            isPermanent
            && nextFormData.grade === "III"
            && nextFormData.alreadyConfirmedPermanent;

        if (gradeImpliesPermanent || gradeThreeAlreadyConfirmed) {
            nextFormData.ebGrade3Passed = true;
            nextFormData.languageQualificationPassed = true;
            nextFormData.medicalReportCompleted = true;
            nextFormData.olApproved = true;
            nextFormData.alApproved = true;
            nextFormData.degreeApproved = true;
            nextFormData.birthCertificateApproved = true;
        }

        if (gradeImpliesPermanent) {
            nextFormData.alreadyConfirmedPermanent = true;
            nextFormData.ebGrade2Passed = true;
            nextFormData.otherGrade2RequirementCompleted = true;
            if (!nextFormData.permanentConfirmationDate) {
                nextFormData.permanentConfirmationDate =
                    nextFormData.appointmentDateToPresentClassGrade;
            }
        }

        if (gradeThreeAlreadyConfirmed && nextFormData.permanentConfirmationDate) {
            nextFormData.appointmentDateToPresentClassGrade =
                nextFormData.permanentConfirmationDate;
        }

        if (name === "designationId") {
            const designation = designations.find(
                (item) => item.id === Number(value)
            );
            appendCustomRequirementFields(
                nextFormData,
                selectedEmployee,
                designation
            );
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

        const payload = buildEmployeePayload(
            formData,
            selectedDesignation,
            selectedEmployee,
            {
                showPermanentConfirmationSection,
                showQualificationSection
            }
        );

        if (isEdit) {
            handleSubmit(payload);
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
        formData.employmentType === "PERMANENT"
        && formData.grade === "III"
        && !formData.alreadyConfirmedPermanent;
    const showPermanentConfirmationSection =
        formData.employmentType === "PERMANENT"
        && formData.grade === "III"
        && formData.alreadyConfirmedPermanent;
    const showGrade2Section =
        formData.employmentType === "PERMANENT" && formData.grade === "II";
    const showGrade2ProgressSection =
        formData.employmentType === "PERMANENT"
        && formData.grade === "III"
        && formData.alreadyConfirmedPermanent;
    const showGrade1ProgressSection =
        formData.employmentType === "PERMANENT" && formData.grade === "II";
    const showPresentClassGradeDate =
        !showGrade2Section
        && !showQualificationSection
        && !showPermanentConfirmationSection;

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
                        {showGrade2Section && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    {...dateFieldProps}
                                    label="Present Class / Grade Date"
                                    name="appointmentDateToPresentClassGrade"
                                    value={formData.appointmentDateToPresentClassGrade}
                                />
                            </Grid>
                        )}

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

                {formData.employmentType === "PERMANENT" && formData.grade === "III" && (
                    <FormSection
                        title="Permanent Confirmation"
                        description="Use this only when an existing employee is already confirmed permanent."
                    >
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="alreadyConfirmedPermanent"
                                            checked={formData.alreadyConfirmedPermanent}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Already Confirmed Permanent?"
                                />
                            </Grid>
                            {showPermanentConfirmationSection && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        {...dateFieldProps}
                                        label="Permanent Confirmation Date"
                                        name="permanentConfirmationDate"
                                        value={formData.permanentConfirmationDate}
                                        helperText="This also becomes the present class / grade date."
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </FormSection>
                )}

                {showGrade2ProgressSection && (
                    <FormSection
                        title="Grade II Requirements"
                        description="This employee is still Grade III. Record requirements already completed toward future Grade II promotion."
                    >
                        {selectedDesignation?.grade2RequiredYears != null && (
                            <Chip
                                size="small"
                                label={`Required service before Grade II: ${selectedDesignation.grade2RequiredYears} year(s) from first appointment date`}
                                variant="outlined"
                                sx={{ mb: 2 }}
                            />
                        )}
                        <Grid container spacing={1.5}>
                            {renderFixedRequirementCheckboxes(
                                FIXED_GRADE2_REQUIREMENTS,
                                formData,
                                handleChange
                            )}
                            {renderCustomRequirementCheckboxes(
                                "CUSTOM_GRADE_2_REQUIREMENT",
                                selectedDesignation?.grade2Requirements,
                                formData,
                                selectedEmployee,
                                handleChange
                            )}
                        </Grid>
                        {(selectedDesignation?.grade2Requirements || []).length === 0 && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                No custom Grade II requirements are configured for
                                this designation.
                            </Alert>
                        )}
                    </FormSection>
                )}

                {showQualificationSection && (
                    <FormSection
                        title="Qualification Requirements"
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
                            {(selectedDesignation?.permanentRequirements || []).map(
                                (requirement) => {
                                    const key = requirementKey(
                                        "CUSTOM_PERMANENT_REQUIREMENT",
                                        requirement.requirementName
                                    );
                                    const checked = formData[key]
                                        ?? isNamedRequirementCompleted(
                                            selectedEmployee,
                                            "CUSTOM_PERMANENT_REQUIREMENT",
                                            requirement.requirementName
                                        );
                                    return (
                                        <Grid
                                            key={key}
                                            size={{ xs: 12, sm: 6, md: 4 }}
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        name={key}
                                                        checked={Boolean(checked)}
                                                        onChange={handleChange}
                                                    />
                                                }
                                                label={requirement.requirementName}
                                            />
                                        </Grid>
                                    );
                                }
                            )}
                        </Grid>
                    </FormSection>
                )}

                {showGrade1ProgressSection && (
                    <FormSection
                        title="Grade I Requirements"
                        description="This employee is Grade II. Record requirements already completed toward future Grade I promotion."
                    >
                        {selectedDesignation?.grade1RequiredYears != null && (
                            <Chip
                                size="small"
                                label={`Required service before Grade I: ${selectedDesignation.grade1RequiredYears} year(s) from present class / grade date`}
                                variant="outlined"
                                sx={{ mb: 2 }}
                            />
                        )}
                        <Grid container spacing={1.5}>
                            {renderFixedRequirementCheckboxes(
                                FIXED_GRADE1_REQUIREMENTS,
                                formData,
                                handleChange
                            )}
                            {renderCustomRequirementCheckboxes(
                                "CUSTOM_GRADE_1_REQUIREMENT",
                                selectedDesignation?.grade1Requirements,
                                formData,
                                selectedEmployee,
                                handleChange
                            )}
                        </Grid>
                        {(selectedDesignation?.grade1Requirements || []).length === 0 && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                No custom Grade I requirements are configured for
                                this designation.
                            </Alert>
                        )}
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
                        {showPresentClassGradeDate && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    {...dateFieldProps}
                                    label="Present Class / Grade"
                                    name="appointmentDateToPresentClassGrade"
                                    value={formData.appointmentDateToPresentClassGrade}
                                    helperText="Appointment to current class"
                                />
                            </Grid>
                        )}
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
