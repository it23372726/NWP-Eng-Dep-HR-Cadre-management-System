import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Alert } from "@mui/material";

import { getDesignations } from "../../services/designationService";
import { getServices } from "../../services/serviceService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps } from "../../utils/formLayout";
import {
    applyGradeDerivedRequirements,
    applyPrivateVehicleFormChanges,
    applyTimelineToFormData,
    appendCustomRequirementFields,
    buildContractCreatePayload,
    buildNonPermanentCreatePayload,
    buildPermanentCreatePayload,
    buildPendingPermanentCreatePayload,
    buildTrainingCreatePayload,
    emptyForm,
    findTrainingServiceLevelId,
    validateCareerHistoryTimeline,
    validateContractFields,
    validatePrivateVehicleFields,
    validateTrainingFields,
    validateWidowsOrphansPensionNo
} from "../../utils/employeeFormUtils";
import {
    applyMaritalStatusFormChanges,
    validateDependentFields
} from "../../utils/employeeDependentForm";
import { isContractEmployee, isTrainingFormType, validateCustomDesignationAssignment, validateDesignationAssignment } from "../../constants/hrms";
import CareerHistoryBuilder, {
    deriveTimelineState
} from "../CareerHistoryBuilder";
import FormSection from "../FormSection";
import EmployeeEmploymentTypeSection, {
    EmployeeContractPositionSection,
    EmployeeNonPermanentPositionSection,
    EmployeeTrainingPositionSection
} from "./EmployeeEmploymentTypeSection";
import EmployeePersonalSection from "./EmployeePersonalSection";
import EmployeeDependentDetailsSection from "./EmployeeDependentDetailsSection";
import EmployeePhotoUpload from "./EmployeePhotoUpload";
import EmployeeQualificationsSection from "./EmployeeQualificationsSection";
import EmployeeWorkplaceSection from "./EmployeeWorkplaceSection";

const EmployeeCreateForm = forwardRef(function EmployeeCreateForm(
    { handleSubmit, open },
    ref
) {
    const [designations, setDesignations] = useState([]);
    const [services, setServices] = useState([]);
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

    useEffect(() => {
        if (!isTrainingFormType(formData.employmentType) || formData.serviceLevelId) {
            return;
        }

        const trainingLevelId = findTrainingServiceLevelId(serviceLevels);
        if (trainingLevelId) {
            setFormData((prev) => ({
                ...prev,
                serviceLevelId: String(trainingLevelId)
            }));
        }
    }, [formData.employmentType, formData.serviceLevelId, serviceLevels]);

    const isPermanent = formData.employmentType === "PERMANENT";
    const isContract = isContractEmployee(formData.employmentType);
    const isTraining = isTrainingFormType(formData.employmentType);
    const hasHistory = historyEvents.length > 0;
    const timelineState = hasHistory
        ? deriveTimelineState(historyEvents)
        : null;

    const selectedDesignation = designations.find((designation) =>
        isPermanent
            ? designation.id === Number(timelineState?.designationId)
            : designation.id === Number(formData.designationId)
    );
    const selectedService = timelineState?.serviceId
        ? services.find((service) => service.id === Number(timelineState.serviceId))
        : null;

    useEffect(() => {
        const loadDropdowns = async () => {
            const [designationData, serviceData, levelData] = await Promise.all([
                getDesignations(),
                getServices(),
                getServiceLevels()
            ]);
            setDesignations(designationData);
            setServices(serviceData);
            setServiceLevels(levelData);
        };

        loadDropdowns();
    }, []);

    const validateAssignment = (nextFormData, designationId, timelineOverride) => {
        const state = timelineOverride ?? timelineState;
        const isCustomAssignment = state?.recordedDesignationName
            && !state?.designationId;

        if (isCustomAssignment) {
            const service = selectedService
                ?? services.find((item) => item.id === Number(state?.serviceId));
            const error = validateCustomDesignationAssignment({
                grade: nextFormData.grade,
                serviceLevelId: nextFormData.serviceLevelId,
                service
            });
            setAssignmentError(error || "");
            return error;
        }

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
            if (value === "PERMANENT") {
                nextFormData.grade = "III";
            } else {
                nextFormData.grade = "None";
                setHistoryEvents([]);
            }
            if (value === "CONTRACT") {
                nextFormData.currentDepartment = nextFormData.currentDepartment
                    || emptyForm.currentDepartment;
            }
            if (value === "TRAINING") {
                nextFormData.serviceLevelId = findTrainingServiceLevelId(serviceLevels);
                nextFormData.trainingPeriodYears = nextFormData.trainingPeriodYears || "1";
                nextFormData.currentDepartment = nextFormData.currentDepartment
                    || emptyForm.currentDepartment;
            }
        }

        nextFormData = applyPrivateVehicleFormChanges(nextFormData, name, value);
        nextFormData = applyMaritalStatusFormChanges(nextFormData, name, value);

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

        const state = deriveTimelineState(events);
        const designation = designations.find(
            (item) => item.id === Number(state.designationId)
        );
        const nextFormData = applyTimelineToFormData(
            formData,
            events,
            designation
        );

        setFormData(nextFormData);
        validateAssignment(nextFormData, nextFormData.designationId, state);
    };

    const { fieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const submitForm = () => {
        setSubmitError("");

        const privateVehicleError = isPermanent && hasHistory
            ? validatePrivateVehicleFields(formData)
            : null;
        if (privateVehicleError) {
            setSubmitError(privateVehicleError);
            return false;
        }

        const dependentError = isPermanent
            ? validateDependentFields(formData)
            : null;
        if (dependentError) {
            setSubmitError(dependentError);
            return false;
        }

        if (isPermanent) {
            if (!hasHistory) {
                const dependentOnlyError = validateDependentFields(formData);
                if (dependentOnlyError) {
                    setSubmitError(dependentOnlyError);
                    return false;
                }

                handleSubmit(
                    buildPendingPermanentCreatePayload(formData),
                    photoOptionsRef.current
                );
                return true;
            }

            const widowsOrphansPensionError = validateWidowsOrphansPensionNo(formData);
            if (widowsOrphansPensionError) {
                setSubmitError(widowsOrphansPensionError);
                return false;
            }

            const timelineError = validateCareerHistoryTimeline(
                historyEvents,
                designations,
                serviceLevels,
                services
            );
            if (timelineError) {
                setSubmitError(timelineError);
                return false;
            }

            const timelineStateForSubmit = deriveTimelineState(historyEvents);
            const error = validateAssignment(
                applyTimelineToFormData(formData, historyEvents, selectedDesignation),
                timelineStateForSubmit?.designationId,
                timelineStateForSubmit
            );
            if (error) {
                setSubmitError(error);
                return false;
            }

            handleSubmit(
                buildPermanentCreatePayload(
                    formData,
                    historyEvents,
                    selectedDesignation,
                    services
                ),
                photoOptionsRef.current
            );
            return true;
        }

        if (isContract) {
            const contractError = validateContractFields(formData);
            if (contractError) {
                setSubmitError(contractError);
                return false;
            }

            handleSubmit(
                buildContractCreatePayload(formData),
                photoOptionsRef.current
            );
            return true;
        }

        if (isTraining) {
            const trainingError = validateTrainingFields(formData);
            if (trainingError) {
                setSubmitError(trainingError);
                return false;
            }

            handleSubmit(
                buildTrainingCreatePayload(formData),
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
        canSubmit: isPermanent
            ? !assignmentError
            : isContract || isTraining
                ? true
                : !assignmentError
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
                selectFieldProps={selectFieldProps}
                showPrivateVehicleFields={isPermanent && hasHistory}
                photoSlot={(
                    <EmployeePhotoUpload
                        open={open}
                        onChange={handlePhotoChange}
                    />
                )}
            />

            {isPermanent && (
                <EmployeeDependentDetailsSection
                    formData={formData}
                    onSpouseChange={(spouse) => {
                        setFormData((prev) => ({ ...prev, spouse }));
                        setSubmitError("");
                    }}
                    onChildrenChange={(children) => {
                        setFormData((prev) => ({ ...prev, children }));
                        setSubmitError("");
                    }}
                />
            )}

            {isPermanent ? (
                <>
                    <FormSection
                        title="Career history"
                        description="Optional — add the first appointment now, or complete career history later from the employee profile."
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
            ) : isContract ? (
                <>
                    <EmployeeContractPositionSection
                        formData={formData}
                        designations={designations}
                        selectFieldProps={selectFieldProps}
                    />

                    <EmployeeWorkplaceSection
                        formData={formData}
                        fieldProps={fieldProps}
                        selectFieldProps={selectFieldProps}
                        variant="contract"
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
            ) : isTraining ? (
                <>
                    <EmployeeTrainingPositionSection
                        formData={formData}
                        designations={designations}
                        selectFieldProps={selectFieldProps}
                        onTrainingPeriodChange={handleChange}
                    />

                    <EmployeeWorkplaceSection
                        formData={formData}
                        fieldProps={fieldProps}
                        selectFieldProps={selectFieldProps}
                        variant="training"
                        onIncrementDateChange={handleChange}
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
