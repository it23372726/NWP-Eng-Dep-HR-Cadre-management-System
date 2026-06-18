import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Alert } from "@mui/material";

import { getDesignations } from "../../services/designationService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps } from "../../utils/formLayout";
import {
    applyGradeDerivedRequirements,
    applyTimelineToFormData,
    appendCustomRequirementFields,
    buildNonPermanentCreatePayload,
    buildPermanentCreatePayload,
    emptyForm,
    validateCareerHistoryTimeline,
    validatePrivateVehicleFields
} from "../../utils/employeeFormUtils";
import { validateDesignationAssignment } from "../../constants/hrms";
import CareerHistoryBuilder, {
    deriveTimelineState
} from "../CareerHistoryBuilder";
import FormSection from "../FormSection";
import EmployeeEmploymentTypeSection, {
    EmployeeNonPermanentPositionSection
} from "./EmployeeEmploymentTypeSection";
import EmployeePersonalSection from "./EmployeePersonalSection";
import EmployeePhotoUpload from "./EmployeePhotoUpload";
import EmployeeQualificationsSection from "./EmployeeQualificationsSection";
import EmployeeWorkplaceSection from "./EmployeeWorkplaceSection";

const EmployeeCreateForm = forwardRef(function EmployeeCreateForm(
    { handleSubmit, open },
    ref
) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [historyEvents, setHistoryEvents] = useState([]);
    const [assignmentError, setAssignmentError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const photoOptionsRef = useRef({ photoFile: null, removePhoto: false });

    const handlePhotoChange = useCallback((options) => {
        photoOptionsRef.current = options;
    }, []);

    useEffect(() => {
        if (open) {
            setFormData(emptyForm);
            setHistoryEvents([]);
            setAssignmentError("");
            setSubmitError("");
            photoOptionsRef.current = { photoFile: null, removePhoto: false };
        }
    }, [open]);

    const isPermanent = formData.employmentType === "PERMANENT";
    const hasHistory = historyEvents.length > 0;
    const timelineState = hasHistory
        ? deriveTimelineState(historyEvents)
        : null;

    const selectedDesignation = designations.find((designation) =>
        isPermanent
            ? designation.id === Number(timelineState?.designationId)
            : designation.id === Number(formData.designationId)
    );

    useEffect(() => {
        const loadDropdowns = async () => {
            const [designationData, levelData] = await Promise.all([
                getDesignations(),
                getServiceLevels()
            ]);
            setDesignations(designationData);
            setServiceLevels(levelData);
        };

        loadDropdowns();
    }, []);

    const validateAssignment = (nextFormData, designationId) => {
        const designation = designations.find(
            (item) => item.id === Number(designationId ?? nextFormData.designationId)
        );

        const error = validateDesignationAssignment(
            {
                grade: nextFormData.grade,
                employmentType: nextFormData.employmentType,
                serviceLevel: serviceLevels.find(
                    (level) => level.id === Number(nextFormData.serviceLevelId)
                )
            },
            designation
        );

        setAssignmentError(error || "");
        return error;
    };

    const handleChange = (event) => {
        const { name, type, checked, value } = event.target;
        let nextFormData = {
            ...formData,
            [name]: type === "checkbox" ? checked : value
        };

        if (name === "employmentType") {
            if (value !== "PERMANENT") {
                nextFormData.grade = "None";
                setHistoryEvents([]);
            } else {
                nextFormData.grade = "III";
            }
        }

        if (name === "privateVehicleUsedForGovWork" && value === "No") {
            nextFormData.privateVehicleDescription = "";
            nextFormData.privateVehiclePermissionDate = "";
        }

        nextFormData = applyGradeDerivedRequirements(nextFormData);

        if (name === "designationId") {
            const designation = designations.find(
                (item) => item.id === Number(value)
            );
            appendCustomRequirementFields(nextFormData, null, designation);
        }

        setFormData(nextFormData);
        setSubmitError("");

        if (
            ["designationId", "serviceLevelId", "employmentType"].includes(name)
        ) {
            validateAssignment(nextFormData);
        }
    };

    const handleHistoryChange = (events) => {
        setHistoryEvents(events);
        setSubmitError("");

        if (!events.length) {
            return;
        }

        const designation = designations.find(
            (item) => item.id === Number(deriveTimelineState(events).designationId)
        );
        const nextFormData = applyTimelineToFormData(
            formData,
            events,
            designation
        );

        setFormData(nextFormData);
        validateAssignment(nextFormData, nextFormData.designationId);
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const submitForm = () => {
        setSubmitError("");

        const privateVehicleError = validatePrivateVehicleFields(formData);
        if (privateVehicleError) {
            setSubmitError(privateVehicleError);
            return false;
        }

        if (isPermanent) {
            if (!hasHistory) {
                setSubmitError(
                    "Add the employee's first appointment in career history."
                );
                return false;
            }

            const timelineError = validateCareerHistoryTimeline(
                historyEvents,
                designations,
                serviceLevels
            );
            if (timelineError) {
                setSubmitError(timelineError);
                return false;
            }

            const error = validateAssignment(
                applyTimelineToFormData(formData, historyEvents, selectedDesignation),
                timelineState?.designationId
            );
            if (error) {
                setSubmitError(error);
                return false;
            }

            handleSubmit(
                buildPermanentCreatePayload(
                    formData,
                    historyEvents,
                    selectedDesignation
                ),
                photoOptionsRef.current
            );
            return true;
        }

        const error = validateAssignment(formData);
        if (error) {
            return false;
        }

        handleSubmit(
            buildNonPermanentCreatePayload(formData, selectedDesignation, null),
            photoOptionsRef.current
        );
        return true;
    };

    useImperativeHandle(ref, () => ({
        submit: submitForm,
        canSubmit: isPermanent ? hasHistory && !assignmentError : !assignmentError
    }));

    return (
        <>
            <EmployeeEmploymentTypeSection
                formData={formData}
                selectFieldProps={selectFieldProps}
            />

            <EmployeePersonalSection
                formData={formData}
                fieldProps={fieldProps}
                dateFieldProps={dateFieldProps}
                selectFieldProps={selectFieldProps}
                photoSlot={(
                    <EmployeePhotoUpload
                        open={open}
                        onChange={handlePhotoChange}
                    />
                )}
            />

            {isPermanent ? (
                <>
                    <FormSection
                        title="Career history"
                        description="Start with the first appointment, then add every lifecycle event up to the employee's current position."
                    >
                        <CareerHistoryBuilder
                            events={historyEvents}
                            onChange={handleHistoryChange}
                            designations={designations}
                            serviceLevels={serviceLevels}
                        />
                    </FormSection>

                    {hasHistory && (
                        <>
                            <EmployeeWorkplaceSection
                                formData={formData}
                                fieldProps={fieldProps}
                                dateFieldProps={dateFieldProps}
                                selectFieldProps={selectFieldProps}
                                variant="permanent"
                                readOnlyWorkplace
                                onIncrementDateChange={handleChange}
                            />

                            <EmployeeQualificationsSection
                                formData={formData}
                                designation={selectedDesignation}
                                employee={null}
                                handleChange={handleChange}
                                grade={timelineState?.grade}
                                permanentConfirmed={
                                    timelineState?.permanentConfirmed
                                }
                            />
                        </>
                    )}
                </>
            ) : (
                <>
                    <EmployeeNonPermanentPositionSection
                        formData={formData}
                        designations={designations}
                        serviceLevels={serviceLevels}
                        selectFieldProps={selectFieldProps}
                        selectedDesignation={selectedDesignation}
                        assignmentError={assignmentError}
                    />

                    <EmployeeWorkplaceSection
                        formData={formData}
                        fieldProps={fieldProps}
                        dateFieldProps={dateFieldProps}
                        selectFieldProps={selectFieldProps}
                        variant="nonPermanent"
                        onDistrictChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                currentDistrictOfWorking: value,
                                currentWorkingPlace: ""
                            }))
                        }
                        onOfficeChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                currentWorkingPlace: value
                            }))
                        }
                    />
                </>
            )}

            {isPermanent && assignmentError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {assignmentError}
                </Alert>
            )}

            {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                </Alert>
            )}
        </>
    );
});

export default EmployeeCreateForm;
