import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Alert } from "@mui/material";

import { getDesignations } from "../../services/designationService";
import { getEmployeeActions } from "../../services/employeeLifecycleService";
import { getServiceLevels } from "../../services/serviceLevelService";
import { createFormFieldProps } from "../../utils/formLayout";
import {
    applyGradeDerivedRequirements,
    applyTimelineToFormData,
    buildNonPermanentUpdatePayload,
    buildPermanentUpdatePayload,
    mapActionsToCareerHistory,
    mapEmployeeToForm,
    validateCareerHistoryTimeline
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
import EmployeeQualificationsSection from "./EmployeeQualificationsSection";
import EmployeeWorkplaceSection from "./EmployeeWorkplaceSection";

const EmployeeEditForm = forwardRef(function EmployeeEditForm(
    { employee, actionHistory, open, handleSubmit },
    ref
) {
    const [designations, setDesignations] = useState([]);
    const [serviceLevels, setServiceLevels] = useState([]);
    const [formData, setFormData] = useState(mapEmployeeToForm(employee));
    const [historyEvents, setHistoryEvents] = useState([]);
    const [assignmentError, setAssignmentError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const initialHistoryRef = useRef("");

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

    useEffect(() => {
        if (!open || !employee || designations.length === 0) {
            return;
        }

        let cancelled = false;

        const loadEditState = async () => {
            setLoadingHistory(true);
            setAssignmentError("");
            setSubmitError("");

            const nextFormData = mapEmployeeToForm(employee);

            try {
                const actions =
                    actionHistory ?? (await getEmployeeActions(employee.id));

                if (cancelled) {
                    return;
                }

                const mappedHistory = mapActionsToCareerHistory(
                    actions,
                    designations,
                    employee
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

        nextFormData = applyGradeDerivedRequirements(nextFormData);

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

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(handleChange);

    const submitForm = () => {
        setSubmitError("");

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
                    employee
                )
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
            )
        );
        return true;
    };

    useImperativeHandle(ref, () => ({
        submit: submitForm,
        canSubmit: isPermanent ? hasHistory && !assignmentError : !assignmentError
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
                dateFieldProps={dateFieldProps}
                selectFieldProps={selectFieldProps}
            />

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
                                dateFieldProps={dateFieldProps}
                                selectFieldProps={selectFieldProps}
                                variant="permanent"
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
                        dateFieldProps={dateFieldProps}
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
