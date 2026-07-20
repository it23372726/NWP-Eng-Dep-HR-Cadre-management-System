import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Alert } from "@mui/material";

import { getDesignations } from "../../services/designationService";
import { getServices } from "../../services/serviceService";
import { getEmployeeActions } from "../../services/employeeLifecycleService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps } from "../../utils/formLayout";
import {
    applyGradeDerivedRequirements,
    applyPrivateVehicleFormChanges,
    applyTimelineToFormData,
    buildContractUpdatePayload,
    buildNonPermanentUpdatePayload,
    buildPermanentUpdatePayload,
    buildPendingPermanentUpdatePayload,
    buildTrainingUpdatePayload,
    mapActionsToCareerHistory,
    mapEmployeeToForm,
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
import { isContractEmployee, isTrainingEmployee, isTrainingFormType, validateCustomDesignationAssignment, validateDesignationAssignment } from "../../constants/hrms";
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

const EmployeeEditForm = forwardRef(function EmployeeEditForm(
    { employee, actionHistory, open, handleSubmit },
    ref
) {
    const [designations, setDesignations] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(mapEmployeeToForm(employee));
    const [historyEvents, setHistoryEvents] = useState([]);
    const [assignmentError, setAssignmentError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [systemPending, setSystemPending] = useState(false);
    const initialHistoryRef = useRef("");
    const photoOptionsRef = useRef({ photoFile: null, removePhoto: false });

    const handlePhotoChange = useCallback((options) => {
        photoOptionsRef.current = options;
    }, []);

    const isPermanent = formData.employmentType === "PERMANENT";
    const isContract = isContractEmployee(formData.employmentType);
    const isTraining = isTrainingFormType(formData.employmentType)
        || isTrainingEmployee(employee);
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
        : employee?.service ?? employee?.designation?.service ?? null;

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

    useEffect(() => {
        if (!open || !employee || designations.length === 0) {
            return;
        }

        let cancelled = false;

        const loadEditState = async () => {
            setLoadingHistory(true);
            setAssignmentError("");
            setSubmitError("");
            photoOptionsRef.current = { photoFile: null, removePhoto: false };

            const nextFormData = mapEmployeeToForm(employee);

            try {
                const actions =
                    actionHistory ?? (await getEmployeeActions(employee.id));

                if (cancelled) {
                    return;
                }

                const isPending = nextFormData.employmentType === "PERMANENT"
                    && (!actions || actions.length === 0);
                setSystemPending(isPending);

                const mappedHistory = mapActionsToCareerHistory(
                    actions,
                    designations,
                    employee,
                    { isSystemPending: isPending }
                );

                setHistoryEvents(mappedHistory);
                initialHistoryRef.current = JSON.stringify(mappedHistory);

                if (
                    nextFormData.employmentType === "PERMANENT"
                    && mappedHistory.length
                ) {
                    const designation = designations.find(
                        (item) =>
                            item.id
                            === Number(
                                deriveTimelineState(mappedHistory).designationId
                            )
                    );
                    setFormData(
                        applyTimelineToFormData(
                            nextFormData,
                            mappedHistory,
                            designation
                        )
                    );
                } else {
                    setFormData(nextFormData);
                }
            } catch {
                if (!cancelled) {
                    setSubmitError("Failed to load career history.");
                }
            } finally {
                if (!cancelled) {
                    setLoadingHistory(false);
                }
            }
        };

        loadEditState();

        return () => {
            cancelled = true;
        };
    }, [open, employee, actionHistory, designations]);

    const handleChange = (event) => {
        const { name, type, checked, value } = event.target;
        let         nextFormData = applyPrivateVehicleFormChanges(
            {
                ...formData,
                [name]: type === "checkbox" ? checked : value
            },
            name,
            type === "checkbox" ? checked : value
        );
        nextFormData = applyMaritalStatusFormChanges(nextFormData, name, value);

        const designationForRules = designations.find(
            (item) => item.id === Number(nextFormData.designationId)
        ) ?? selectedDesignation;
        nextFormData = applyGradeDerivedRequirements(
            nextFormData,
            designationForRules
        );

        setFormData(nextFormData);
        setSubmitError("");

        if (name === "serviceLevelId") {
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
            if (systemPending && !hasHistory) {
                handleSubmit(
                    buildPendingPermanentUpdatePayload(formData),
                    photoOptionsRef.current
                );
                return true;
            }

            const widowsOrphansPensionError = validateWidowsOrphansPensionNo(formData);
            if (widowsOrphansPensionError) {
                setSubmitError(widowsOrphansPensionError);
                return false;
            }

            if (!hasHistory) {
                setSubmitError(
                    "Add the employee's first appointment in career history."
                );
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

            const error = validateAssignment(
                applyTimelineToFormData(
                    formData,
                    historyEvents,
                    selectedDesignation
                ),
                timelineState?.designationId
            );
            if (error) {
                setSubmitError(error);
                return false;
            }

            const historyChanged =
                JSON.stringify(historyEvents) !== initialHistoryRef.current;

            if (
                historyChanged
                && !window.confirm(
                    "Saving will replace the employee's entire career history. Continue?"
                )
            ) {
                return false;
            }

            handleSubmit(
                buildPermanentUpdatePayload(
                    formData,
                    historyEvents,
                    selectedDesignation,
                    employee,
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
                buildContractUpdatePayload(formData),
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
                buildTrainingUpdatePayload(formData),
                photoOptionsRef.current
            );
            return true;
        }

        const error = validateAssignment(formData);
        if (error) {
            return false;
        }

        handleSubmit(
            buildNonPermanentUpdatePayload(
                formData,
                selectedDesignation,
                employee
            ),
            photoOptionsRef.current
        );
        return true;
    };

    useImperativeHandle(ref, () => ({
        submit: submitForm,
        canSubmit: isPermanent
            ? (hasHistory ? !assignmentError : true)
            : isContract || isTraining
                ? true
                : !assignmentError
    }));

    if (loadingHistory) {
        return (
            <Alert severity="info" sx={{ mb: 2 }}>
                Loading employee details...
            </Alert>
        );
    }

    return (
        <>
            <EmployeeEmploymentTypeSection
                formData={formData}
                selectFieldProps={selectFieldProps}
                isCreate={false}
                readOnly
            />

            <EmployeePersonalSection
                formData={formData}
                fieldProps={fieldProps}
                selectFieldProps={selectFieldProps}
                showPrivateVehicleFields={isPermanent && hasHistory}
                photoSlot={(
                    <EmployeePhotoUpload
                        employeeId={employee?.id}
                        hasExistingPhoto={Boolean(employee?.profilePhotoPath)}
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
                        description="Edit the employee's full career timeline. Saving replaces all stored lifecycle actions."
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
                                employee={employee}
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
                        designationDisabled
                    />

                    <EmployeeWorkplaceSection
                        formData={formData}
                        fieldProps={fieldProps}
                        selectFieldProps={selectFieldProps}
                        variant="nonPermanent"
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

export default EmployeeEditForm;
