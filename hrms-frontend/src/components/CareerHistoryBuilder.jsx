import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    FormControlLabel
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useEffect, useState } from "react";

import {
    ACTION_TYPE_LABELS,
    getActionTypeLabel,
    getPrimaryDepartmentName,
    isOtherDesignation,
    isPrimaryDepartment,
    OTHER_DESIGNATION_VALUE
} from "../constants/hrms";
import DepartmentOfficeFields, {
    DEPARTMENT_OPTIONS,
    ReadonlyWorkplaceFields,
    resolveDepartmentValue
} from "./workplace/DepartmentOfficeFields";
import DateInput from "./DateInput";
import DesignationOptionContent from "./DesignationOptionContent";
import { getServices } from "../services/serviceService";
import { createFormFieldProps } from "../utils/formLayout";
import { renderDesignationSelectValue } from "../utils/designationDisplay";
import {
    getServiceLevelsForDesignation,
    buildTransferInCompanionEvent,
    validateCareerHistoryDraftEvent,
    validateCareerHistoryEventAssignment
} from "../utils/employeeFormUtils";
import {
    getCareerHistoryEventMinDate,
    PROBATION_YEARS
} from "../utils/gradeAchievementDates";
import {
    combineMinDates,
    timelineMinDateHelperText,
    validateTimelineDate
} from "../utils/timelineDates";

const STANDARD_GRADE_SEQUENCE = ["III", "II", "I"];

const TERMINAL_TYPES = [
    "RETIREMENT_OR_RESIGNATION",
    "DEATH",
    "DISMISSAL",
    "VACATION_OF_POST"
];

const emptyFirstAppointment = {
    actionDate: "",
    designationId: "",
    recordedDesignationName: "",
    specialDesignationName: "",
    serviceId: "",
    serviceLevelId: "",
    departmentType: DEPARTMENT_OPTIONS.NWP,
    otherDepartmentName: "",
    district: "",
    office: "",
    remarks: ""
};

const emptyEventDraft = {
    actionType: "",
    actionDate: "",
    designationId: "",
    recordedDesignationName: "",
    specialDesignationName: "",
    serviceId: "",
    grade: "",
    serviceLevelId: "",
    departmentType: DEPARTMENT_OPTIONS.NWP,
    otherDepartmentName: "",
    office: "",
    district: "",
    promotionOutcome: "staying",
    toDepartmentType: DEPARTMENT_OPTIONS.OTHER,
    toOtherDepartmentName: "",
    toDistrict: "",
    toOffice: "",
    reason: "",
    remarks: ""
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (date) => {
    if (!date) return "—";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
};

const eventDistrictLabel = (district) => district?.label ?? district ?? null;

const applyNwpDistrict = (department, district, currentDistrictOfWorking) => {
    if (isPrimaryDepartment(department)) {
        const nextDistrict = eventDistrictLabel(district);
        return nextDistrict || currentDistrictOfWorking;
    }

    if (department) {
        return null;
    }

    return currentDistrictOfWorking;
};

const isFirstNwpJoinEvent = (event) => {
    const department =
        event.actionType === "TRANSFER_OUT" || event.actionType === "TRANSFER_IN"
            ? event.toDepartment || event.department
            : event.department;

    if (!isPrimaryDepartment(department)) {
        return false;
    }

    if (
        event.actionType === "NEW_APPOINTMENT"
        || event.actionType === "TRANSFER_OUT"
    ) {
        return true;
    }

    if (event.actionType === "TRANSFER_IN") {
        return !event.autoCreated;
    }

    return false;
};

/**
 * Walks the timeline and derives the employee state after the last event.
 * Mirrors the backend replay/validator logic so the rest of the form can be
 * auto-filled from the timeline.
 */
export const deriveTimelineState = (events) => {
    let designationId = null;
    let recordedDesignationName = null;
    let specialDesignationName = null;
    let serviceId = null;
    let grade = null;
    let serviceLevelId = null;
    let currentDepartment = null;
    let currentOffice = null;
    let currentDistrictOfWorking = null;
    let active = false;
    let permanentConfirmed = false;
    let permanentConfirmationDate = null;
    let grade2AchievedDate = null;
    let grade1AchievedDate = null;
    let supraAchievedDate = null;
    let specialAchievedDate = null;
    let deathRecorded = false;
    let lastDate = null;
    let firstAppointmentDate = null;
    let reportedDateToPresentWorkingPlace = null;
    let enteredDateToNWPCouncil = null;

    events.forEach((event) => {
        switch (event.actionType) {
            case "NEW_APPOINTMENT":
                if (event.recordedDesignationName) {
                    recordedDesignationName = event.recordedDesignationName;
                    designationId = null;
                    specialDesignationName = null;
                    if (event.serviceId) {
                        serviceId = event.serviceId;
                    }
                } else {
                    designationId = event.designationId;
                    recordedDesignationName = null;
                    specialDesignationName = event.specialDesignationName?.trim() || null;
                }
                grade = event.grade || "III";
                firstAppointmentDate = event.actionDate;
                active = true;
                if (event.department) {
                    currentDepartment = event.department;
                    currentOffice = event.office;
                    currentDistrictOfWorking = applyNwpDistrict(
                        event.department,
                        event.district,
                        currentDistrictOfWorking
                    );
                }
                break;
            case "PERMANENT_CONFIRMATION":
                permanentConfirmed = true;
                permanentConfirmationDate = event.actionDate;
                break;
            case "PROMOTION":
            case "ASSIGNMENT_GRADE_UPDATE":
                if (event.recordedDesignationName) {
                    recordedDesignationName = event.recordedDesignationName;
                    designationId = null;
                    specialDesignationName = null;
                } else if (event.designationId) {
                    designationId = event.designationId;
                    recordedDesignationName = null;
                    specialDesignationName = event.specialDesignationName?.trim() || null;
                } else if (event.specialDesignationName != null) {
                    specialDesignationName = event.specialDesignationName?.trim() || null;
                }
                if (event.grade) {
                    if (grade === "III" && event.grade === "II") {
                        grade2AchievedDate = event.actionDate;
                    }
                    if (grade === "II" && event.grade === "I") {
                        grade1AchievedDate = event.actionDate;
                    }
                    if (grade === "I" && event.grade === "Supra") {
                        supraAchievedDate = event.actionDate;
                    }
                    if (grade === "I" && event.grade === "Special") {
                        specialAchievedDate = event.actionDate;
                    }
                    grade = event.grade;
                }
                break;
            case "TRANSFER_IN":
                if (event.toDepartment) {
                    currentDepartment = event.toDepartment;
                    currentOffice = event.toOffice;
                    currentDistrictOfWorking = applyNwpDistrict(
                        event.toDepartment,
                        event.toDistrict,
                        currentDistrictOfWorking
                    );
                } else if (event.department) {
                    currentDepartment = event.department;
                    currentOffice = event.office;
                    currentDistrictOfWorking = applyNwpDistrict(
                        event.department,
                        event.district,
                        currentDistrictOfWorking
                    );
                }
                active = true;
                break;
            case "TRANSFER_OUT":
                if (event.recordedDesignationName) {
                    recordedDesignationName = event.recordedDesignationName;
                    designationId = null;
                    specialDesignationName = null;
                } else if (event.designationId) {
                    designationId = event.designationId;
                    recordedDesignationName = null;
                    specialDesignationName = event.specialDesignationName?.trim() || null;
                }
                if (event.serviceLevelId) {
                    serviceLevelId = event.serviceLevelId;
                }
                if (event.toDepartment) {
                    currentDepartment = event.toDepartment;
                    currentOffice = event.toOffice;
                    currentDistrictOfWorking = applyNwpDistrict(
                        event.toDepartment,
                        event.toDistrict,
                        currentDistrictOfWorking
                    );
                } else if (event.department) {
                    currentDepartment = event.department;
                    currentOffice = event.office;
                    currentDistrictOfWorking = applyNwpDistrict(
                        event.department,
                        event.district,
                        currentDistrictOfWorking
                    );
                }
                active = true;
                break;
            case "OFFICE_CHANGE":
                if (event.office) {
                    currentOffice = event.office;
                }
                if (event.department) {
                    currentDepartment = event.department;
                }
                if (event.district) {
                    currentDistrictOfWorking = eventDistrictLabel(event.district);
                }
                break;
            case "RETIREMENT_OR_RESIGNATION":
            case "DISMISSAL":
            case "VACATION_OF_POST":
                active = false;
                break;
            case "DEATH":
                active = false;
                deathRecorded = true;
                break;
            default:
                break;
        }

        if (event.serviceLevelId) {
            serviceLevelId = event.serviceLevelId;
        }
        lastDate = event.actionDate;

        if (
            event.actionType === "NEW_APPOINTMENT"
            || event.actionType === "OFFICE_CHANGE"
            || event.actionType === "TRANSFER_OUT"
            || (event.actionType === "TRANSFER_IN" && !event.autoCreated)
        ) {
            reportedDateToPresentWorkingPlace = event.actionDate;
        }

        if (enteredDateToNWPCouncil == null && isFirstNwpJoinEvent(event)) {
            enteredDateToNWPCouncil = event.actionDate;
        }
    });

    return {
        designationId,
        recordedDesignationName,
        specialDesignationName,
        serviceId,
        grade,
        serviceLevelId,
        currentDepartment,
        currentOffice,
        currentDistrictOfWorking,
        active,
        permanentConfirmed,
        permanentConfirmationDate,
        grade2AchievedDate,
        grade1AchievedDate,
        deathRecorded,
        lastDate,
        firstAppointmentDate,
        reportedDateToPresentWorkingPlace,
        enteredDateToNWPCouncil
    };
};

const nextGradeOptions = (currentGrade, allowedGrades = []) => {
    const allowed = allowedGrades?.length
        ? allowedGrades.filter((grade) => grade !== "None")
        : [...STANDARD_GRADE_SEQUENCE, "Supra", "Special"];

    if (!currentGrade) {
        return allowed;
    }

    const options = [currentGrade];
    if (currentGrade === "III" && allowed.includes("II")) {
        options.push("II");
    }
    if (currentGrade === "II" && allowed.includes("I")) {
        options.push("I");
    }
    if (currentGrade === "I") {
        if (allowed.includes("Supra")) {
            options.push("Supra");
        } else if (allowed.includes("Special")) {
            options.push("Special");
        }
    }
    return options;
};

const eventSummary = (event, designations, serviceLevels) => {
    const parts = [];
    if (event.specialDesignationName?.trim()) {
        parts.push(event.specialDesignationName.trim());
    } else if (event.recordedDesignationName) {
        parts.push(event.recordedDesignationName);
    } else {
        const designation = designations.find(
            (d) => d.id === Number(event.designationId)
        );
        if (designation) {
            parts.push(designation.designationName);
        }
    }
    if (event.grade) {
        parts.push(`Grade ${event.grade}`);
    }
    const level = serviceLevels.find(
        (l) => l.id === Number(event.serviceLevelId)
    );
    if (level) {
        parts.push(level.levelName);
    }
    if (event.transferringOut && event.toDepartment) {
        parts.push(`Transfers out to ${event.toDepartment}`);
    }
    if (event.department && event.office) {
        parts.push(`${event.department} — ${event.office}`);
    } else if (event.department) {
        parts.push(event.department);
    }
    if (event.toDepartment && event.toOffice) {
        parts.push(`To: ${event.toDepartment} — ${event.toOffice}`);
    } else if (event.toDepartment) {
        parts.push(`To: ${event.toDepartment}`);
    }
    if (event.transferredFrom) {
        parts.push(`From: ${event.transferredFrom}`);
    }
    if (event.transferredTo) {
        parts.push(`To: ${event.transferredTo}`);
    }
    if (event.reason) {
        parts.push(`Reason: ${event.reason}`);
    }
    return parts.join(" · ");
};

const requiredServiceLevelHelper = (designation) => {
    if (!designation?.serviceLevel?.levelName) {
        return undefined;
    }

    return `Required: ${designation.serviceLevel.levelName}`;
};

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

export default function CareerHistoryBuilder({
    events,
    onChange,
    designations,
    serviceLevels
}) {
    const [firstDraft, setFirstDraft] = useState(emptyFirstAppointment);
    const [eventDraft, setEventDraft] = useState(emptyEventDraft);
    const [error, setError] = useState("");
    const [services, setServices] = useState([]);

    useEffect(() => {
        getServices().then(setServices).catch(() => setServices([]));
    }, []);

    const state = deriveTimelineState(events);
    const hasFirstAppointment = events.length > 0;

    const currentDesignation = designations.find(
        (d) => d.id === Number(state.designationId)
    );
    const promotionServiceId = state.serviceId ?? currentDesignation?.service?.id;
    const promotionService = services.find(
        (item) => item.id === Number(promotionServiceId)
    );
    const serviceAllowedGrades = promotionService?.allowedGrades ?? [];

    const availableActionTypes = (() => {
        if (state.deathRecorded) {
            return [];
        }
        if (!state.active) {
            return [];
        }
        const types = [];
        if (state.grade === "III" && !state.permanentConfirmed) {
            types.push("PERMANENT_CONFIRMATION");
        }
        types.push("PROMOTION", "ASSIGNMENT_GRADE_UPDATE", "TRANSFER_OUT", "OFFICE_CHANGE");
        types.push(...TERMINAL_TYPES);
        return types;
    })();

    const promotionDesignations = promotionServiceId
        ? designations.filter((d) => d.service?.id === promotionServiceId)
        : designations;

    const isOtherFirstDesignation = isOtherDesignation(firstDraft.designationId);
    const isOtherEventDesignation = isOtherDesignation(eventDraft.designationId);

    const firstDraftDesignation = isOtherFirstDesignation
        ? null
        : designations.find((item) => item.id === Number(firstDraft.designationId));
    const eventDraftDesignation = isOtherEventDesignation
        ? null
        : designations.find((item) => item.id === Number(eventDraft.designationId));
    const firstDraftServiceLevels = isOtherFirstDesignation
        ? serviceLevels
        : getServiceLevelsForDesignation(firstDraftDesignation, serviceLevels);
    const eventDraftServiceLevels = isOtherEventDesignation
        ? serviceLevels
        : getServiceLevelsForDesignation(
            eventDraftDesignation || currentDesignation,
            serviceLevels
        );
    const eventRulesSource = isOtherEventDesignation
        ? { service: services.find((item) => item.id === Number(
            eventDraft.serviceId || state.serviceId
        )) }
        : (eventDraftDesignation || currentDesignation);

    const firstDraftAssignmentError =
        (firstDraft.designationId || isOtherFirstDesignation)
        && firstDraft.serviceLevelId
            ? validateCareerHistoryEventAssignment({
                designationId: firstDraft.designationId,
                recordedDesignationName: firstDraft.recordedDesignationName,
                grade: "III",
                serviceLevelId: firstDraft.serviceLevelId,
                serviceId: firstDraft.serviceId,
                effectiveServiceLevelId: firstDraft.serviceLevelId,
                designations,
                serviceLevels,
                services
            })
            : null;

    const eventDraftAssignmentError = validateCareerHistoryDraftEvent({
        actionType: eventDraft.actionType,
        actionDate: eventDraft.actionDate,
        designationId: eventDraft.designationId,
        recordedDesignationName: eventDraft.recordedDesignationName,
        grade: eventDraft.grade,
        serviceLevelId: eventDraft.serviceLevelId,
        serviceId: eventDraft.serviceId,
        timelineState: state,
        designations,
        serviceLevels,
        services
    });

    const eventDraftDesignationForMinDate = eventRulesSource;
    const previousEventDate = state.lastDate;
    const serviceMinDate = getCareerHistoryEventMinDate({
        actionType: eventDraft.actionType,
        grade: eventDraft.grade,
        timelineState: state,
        designation: eventDraftDesignationForMinDate
    });
    const eventDraftMinDate = combineMinDates(serviceMinDate, previousEventDate);
    const eventDraftChronologyError = validateTimelineDate(
        eventDraft.actionDate,
        previousEventDate
    );
    const eventDraftDateTooEarly = Boolean(
        eventDraftMinDate
        && eventDraft.actionDate
        && eventDraft.actionDate < eventDraftMinDate
    );
    const eventDraftDateHelperText = (() => {
        if (eventDraftDateTooEarly) {
            if (eventDraftChronologyError) {
                return eventDraftChronologyError;
            }
            if (eventDraft.actionType === "PERMANENT_CONFIRMATION") {
                return `Confirmation date cannot be earlier than ${formatDisplayDate(eventDraftMinDate)} (${PROBATION_YEARS}-year probation).`;
            }
            if (state.grade === "III" && eventDraft.grade === "II") {
                return `Effective date cannot be earlier than ${formatDisplayDate(eventDraftMinDate)} (Grade II service period).`;
            }
            if (state.grade === "II" && eventDraft.grade === "I") {
                return `Effective date cannot be earlier than ${formatDisplayDate(eventDraftMinDate)} (Grade I service period).`;
            }
            return timelineMinDateHelperText(eventDraftMinDate, { tooEarly: true });
        }
        if (eventDraftMinDate) {
            if (serviceMinDate && serviceMinDate === eventDraftMinDate) {
                if (eventDraft.actionType === "PERMANENT_CONFIRMATION") {
                    return `Earliest allowed: ${formatDisplayDate(eventDraftMinDate)} (${PROBATION_YEARS}-year probation).`;
                }
                if (state.grade === "III" && eventDraft.grade === "II") {
                    return `Earliest allowed: ${formatDisplayDate(eventDraftMinDate)} (Grade II service period).`;
                }
                if (state.grade === "II" && eventDraft.grade === "I") {
                    return `Earliest allowed: ${formatDisplayDate(eventDraftMinDate)} (Grade I service period).`;
                }
            }
            return timelineMinDateHelperText(eventDraftMinDate);
        }
        return undefined;
    })();
    const canAddEvent = Boolean(
        eventDraft.actionType
        && eventDraft.actionDate
        && !eventDraftDateTooEarly
    );

    const handleFirstDraftChange = (e) => {
        const { name, value } = e.target;
        setFirstDraft((prev) => {
            let next = { ...prev, [name]: value };

            if (name === "designationId") {
                if (isOtherDesignation(value)) {
                    next = {
                        ...next,
                        recordedDesignationName: "",
                        specialDesignationName: "",
                        serviceId: "",
                        serviceLevelId: ""
                    };
                } else {
                    next = applyRequiredServiceLevel(next, value, designations);
                    next.recordedDesignationName = "";
                    next.specialDesignationName = "";
                    next.serviceId = "";
                }
            }

            return next;
        });
        setError("");
    };

    const handleEventDraftChange = (e) => {
        const { name, value } = e.target;
        setEventDraft((prev) => {
            let next = { ...prev, [name]: value };

            if (name === "actionType") {
                const next = {
                    ...emptyEventDraft,
                    actionType: value,
                    actionDate: prev.actionDate
                };
                if (value === "TRANSFER_OUT") {
                    const timeline = deriveTimelineState(events);
                    if (timeline.recordedDesignationName) {
                        next.designationId = OTHER_DESIGNATION_VALUE;
                        next.recordedDesignationName = timeline.recordedDesignationName;
                        next.specialDesignationName = "";
                    } else if (timeline.designationId) {
                        next.designationId = String(timeline.designationId);
                        next.specialDesignationName = timeline.specialDesignationName ?? "";
                    }
                    next.serviceLevelId = timeline.serviceLevelId
                        ? String(timeline.serviceLevelId)
                        : "";
                }
                return next;
            }

            if (name === "designationId") {
                if (isOtherDesignation(value)) {
                    next = {
                        ...next,
                        recordedDesignationName: "",
                        specialDesignationName: "",
                        serviceId: "",
                        serviceLevelId: ""
                    };
                } else {
                    next = applyRequiredServiceLevel(next, value, designations);
                    next.recordedDesignationName = "";
                    next.specialDesignationName = "";
                    next.serviceId = "";
                }
            }

            return next;
        });
        setError("");
    };

    const addFirstAppointment = () => {
        if (!firstDraft.actionDate) {
            setError("First appointment date is required");
            return;
        }
        if (firstDraft.actionDate > todayIso()) {
            setError("First appointment date cannot be in the future");
            return;
        }
        if (!firstDraft.designationId) {
            setError("First appointment designation is required");
            return;
        }
        if (isOtherFirstDesignation && !firstDraft.recordedDesignationName?.trim()) {
            setError("Designation title is required for Other");
            return;
        }
        if (isOtherFirstDesignation && !firstDraft.serviceId) {
            setError("Service is required for the first custom designation");
            return;
        }
        if (!firstDraft.serviceLevelId) {
            setError("First appointment service level is required");
            return;
        }

        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: firstDraft.designationId,
            recordedDesignationName: firstDraft.recordedDesignationName,
            grade: "III",
            serviceLevelId: firstDraft.serviceLevelId,
            serviceId: firstDraft.serviceId,
            effectiveServiceLevelId: firstDraft.serviceLevelId,
            designations,
            serviceLevels,
            services
        });

        if (assignmentError) {
            setError(assignmentError);
            return;
        }

        if (!firstDraft.office?.trim()) {
            setError("First appointment office is required");
            return;
        }
        const department = resolveDepartmentValue(
            firstDraft.departmentType,
            firstDraft.otherDepartmentName
        );
        if (!department) {
            setError("First appointment department is required");
            return;
        }
        if (firstDraft.departmentType === DEPARTMENT_OPTIONS.OTHER
            && !firstDraft.otherDepartmentName?.trim()) {
            setError("Other department name is required");
            return;
        }

        if (firstDraft.departmentType === DEPARTMENT_OPTIONS.NWP && !firstDraft.district) {
            setError(`Working district is required for ${getPrimaryDepartmentName()}`);
            return;
        }

        onChange([
            {
                actionType: "NEW_APPOINTMENT",
                actionDate: firstDraft.actionDate,
                designationId: isOtherFirstDesignation
                    ? null
                    : Number(firstDraft.designationId),
                recordedDesignationName: isOtherFirstDesignation
                    ? firstDraft.recordedDesignationName.trim()
                    : null,
                specialDesignationName: isOtherFirstDesignation
                    ? null
                    : firstDraft.specialDesignationName?.trim() || null,
                serviceId: isOtherFirstDesignation
                    ? Number(firstDraft.serviceId)
                    : null,
                grade: "III",
                serviceLevelId: Number(firstDraft.serviceLevelId),
                department,
                office: firstDraft.office.trim(),
                district: firstDraft.departmentType === DEPARTMENT_OPTIONS.NWP
                    ? firstDraft.district
                    : null,
                remarks: firstDraft.remarks?.trim() || null
            }
        ]);
        setFirstDraft(emptyFirstAppointment);
        setError("");
    };

    const validateEventDraft = () => {
        if (!eventDraft.actionType) {
            return "Select the event type";
        }
        if (!eventDraft.actionDate) {
            return "Event date is required";
        }
        if (eventDraft.actionDate > todayIso()) {
            return "Event date cannot be in the future";
        }
        if (state.lastDate) {
            const chronologyError = validateTimelineDate(
                eventDraft.actionDate,
                state.lastDate
            );
            if (chronologyError) {
                return chronologyError;
            }
        }

        switch (eventDraft.actionType) {
            case "PROMOTION":
                if (!eventDraft.designationId) {
                    return "Promotion requires the new designation";
                }
                if (isOtherEventDesignation && !eventDraft.recordedDesignationName?.trim()) {
                    return "Designation title is required for Other";
                }
                if (isOtherEventDesignation && !eventDraft.serviceLevelId) {
                    return "Promotion with a custom title requires a service level";
                }
                if (!eventDraft.grade) {
                    return "Promotion requires the grade";
                }
                if (
                    isPrimaryDepartment(state.currentDepartment)
                    && eventDraft.promotionOutcome === "transferringOut"
                ) {
                    const promotionDestination = resolveDepartmentValue(
                        eventDraft.toDepartmentType,
                        eventDraft.toOtherDepartmentName
                    );
                    if (!promotionDestination || !eventDraft.toOffice?.trim()) {
                        return "Promotion transfer out requires destination department and office";
                    }
                }
                break;
            case "ASSIGNMENT_GRADE_UPDATE":
                if (!eventDraft.grade) {
                    return "Grade update requires the new grade";
                }
                break;
            case "TRANSFER_OUT": {
                const toDepartment = resolveDepartmentValue(
                    eventDraft.toDepartmentType,
                    eventDraft.toOtherDepartmentName
                );
                if (!eventDraft.designationId) {
                    return "Transfer out requires the destination designation";
                }
                if (isOtherEventDesignation && !eventDraft.recordedDesignationName?.trim()) {
                    return "Designation title is required for Other";
                }
                if (!eventDraft.serviceLevelId) {
                    return "Transfer out requires the destination service level";
                }
                if (!toDepartment || !eventDraft.toOffice?.trim()) {
                    return "Transfer out requires destination department and office";
                }
                if (isPrimaryDepartment(toDepartment) && !eventDraft.toDistrict) {
                    return `Transfer to ${getPrimaryDepartmentName()} requires a working district`;
                }
                if (state.currentDepartment
                    && state.currentDepartment.toLowerCase() === toDepartment.toLowerCase()) {
                    return "Transfer out requires a different department";
                }
                break;
            }
            case "OFFICE_CHANGE":
                if (!eventDraft.office?.trim()) {
                    return "Office change requires the new office";
                }
                if (isPrimaryDepartment(state.currentDepartment)) {
                    if (!eventDraft.district) {
                        return "Office change requires the working district";
                    }
                    if (state.currentOffice
                        && state.currentOffice.toLowerCase() === eventDraft.office.trim().toLowerCase()
                        && state.currentDistrictOfWorking === eventDraft.district) {
                        return "Change the office, working district, or both";
                    }
                } else if (state.currentOffice
                    && state.currentOffice.toLowerCase() === eventDraft.office.trim().toLowerCase()) {
                    return "New office must be different from the current office";
                }
                break;
            case "DISMISSAL":
                if (!eventDraft.reason?.trim()) {
                    return "Dismissal requires a reason";
                }
                break;
            case "VACATION_OF_POST":
                if (!eventDraft.reason?.trim()) {
                    return "Vacation of post requires a reason";
                }
                break;
            default:
                break;
        }

        const assignmentError = validateCareerHistoryDraftEvent({
            actionType: eventDraft.actionType,
            actionDate: eventDraft.actionDate,
            designationId: eventDraft.designationId,
            recordedDesignationName: eventDraft.recordedDesignationName,
            grade: eventDraft.grade,
            serviceLevelId: eventDraft.serviceLevelId,
            serviceId: eventDraft.serviceId,
            timelineState: state,
            designations,
            serviceLevels,
            services
        });

        if (assignmentError) {
            return assignmentError;
        }

        if (eventDraft.actionType === "TRANSFER_OUT") {
            if (!state.currentDepartment || !state.currentOffice) {
                return "Current department and office must be set before transfer out";
            }
        } else if (eventDraft.actionType !== "OFFICE_CHANGE") {
            if (!state.currentDepartment || !state.currentOffice) {
                return "Current department and office must be set from prior events";
            }
        } else if (!state.currentDepartment) {
            return "Current department must be set before office change";
        }

        return "";
    };

    const addEvent = () => {
        const draftError = validateEventDraft();
        if (draftError) {
            setError(draftError);
            return;
        }

        const toDepartment = resolveDepartmentValue(
            eventDraft.toDepartmentType,
            eventDraft.toOtherDepartmentName
        );

        const event = {
            actionType: eventDraft.actionType,
            actionDate: eventDraft.actionDate,
            designationId: eventDraft.designationId
                && !isOtherEventDesignation
                ? Number(eventDraft.designationId)
                : null,
            recordedDesignationName: isOtherEventDesignation
                ? eventDraft.recordedDesignationName.trim()
                : null,
            specialDesignationName: isOtherEventDesignation
                ? null
                : eventDraft.specialDesignationName?.trim() || null,
            grade: eventDraft.grade || null,
            serviceLevelId: eventDraft.serviceLevelId
                ? Number(eventDraft.serviceLevelId)
                : null,
            ...(eventDraft.actionType === "OFFICE_CHANGE"
                ? {
                    department: state.currentDepartment,
                    office: eventDraft.office.trim(),
                    district: isPrimaryDepartment(state.currentDepartment)
                        ? eventDraft.district
                        : null
                }
                : {}),
            ...(eventDraft.actionType === "TRANSFER_OUT"
                ? {
                    toDepartment,
                    toOffice: eventDraft.toOffice.trim(),
                    toDistrict: isPrimaryDepartment(toDepartment)
                        ? eventDraft.toDistrict
                        : null
                }
                : {}),
            ...(eventDraft.actionType === "PROMOTION"
                && isPrimaryDepartment(state.currentDepartment)
                && eventDraft.promotionOutcome === "transferringOut"
                ? {
                    transferringOut: true,
                    toDepartment,
                    toOffice: eventDraft.toOffice.trim(),
                    toDistrict: null
                }
                : {}),
            reason: eventDraft.reason?.trim() || null,
            remarks: eventDraft.remarks?.trim() || null
        };

        if (eventDraft.actionType === "TRANSFER_OUT") {
            const transferInEvent = buildTransferInCompanionEvent({
                actionDate: eventDraft.actionDate,
                toDepartment,
                toOffice: eventDraft.toOffice,
                toDistrict: eventDraft.toDistrict,
                fromDepartment: state.currentDepartment,
                designationId: isOtherEventDesignation
                    ? null
                    : (eventDraft.designationId
                        ? Number(eventDraft.designationId)
                        : null),
                recordedDesignationName: isOtherEventDesignation
                    ? eventDraft.recordedDesignationName?.trim() || null
                    : null,
                specialDesignationName: isOtherEventDesignation
                    ? null
                    : eventDraft.specialDesignationName?.trim() || null,
                grade: state.grade,
                serviceLevelId: eventDraft.serviceLevelId
                    ? Number(eventDraft.serviceLevelId)
                    : state.serviceLevelId,
                remarks: eventDraft.remarks
            });
            onChange([...events, event, transferInEvent]);
        } else {
            onChange([...events, event]);
        }
        setEventDraft(emptyEventDraft);
        setError("");
    };

    const removeLastEvent = () => {
        const nextEvents = [...events];

        while (
            nextEvents.length > 0
            && nextEvents[nextEvents.length - 1].autoCreated
        ) {
            nextEvents.pop();
        }

        if (nextEvents.length > 0) {
            nextEvents.pop();
        }

        onChange(nextEvents);
        setError("");
    };

    const lastRemovableIndex = events.findLastIndex((event) => !event.autoCreated);

    const { fieldProps, selectFieldProps } =
        createFormFieldProps(() => {});

    const draftType = eventDraft.actionType;
    const showDesignationField =
        draftType === "PROMOTION" || draftType === "TRANSFER_OUT";
    const designationFieldLabel = draftType === "TRANSFER_OUT"
        ? "Designation at new department"
        : "New Designation";
    const showGradeField =
        draftType === "PROMOTION" || draftType === "ASSIGNMENT_GRADE_UPDATE";
    const showServiceLevelField =
        draftType === "PROMOTION"
        || draftType === "ASSIGNMENT_GRADE_UPDATE"
        || draftType === "TRANSFER_OUT";
    const showOtherDesignationFields = (field) =>
        field === "first"
            ? isOtherFirstDesignation
            : isOtherEventDesignation;
    const showSpecialDesignationField = (field) =>
        field === "first"
            ? Boolean(firstDraft.designationId) && !isOtherFirstDesignation
            : Boolean(eventDraft.designationId) && !isOtherEventDesignation;
    const showTransferDestination = draftType === "TRANSFER_OUT";
    const showPromotionOutcome =
        draftType === "PROMOTION"
        && isPrimaryDepartment(state.currentDepartment);
    const promotionTransferringOut = eventDraft.promotionOutcome === "transferringOut";
    const showPromotionTransferDestination =
        showPromotionOutcome && promotionTransferringOut;
    const showOfficeChangeField = draftType === "OFFICE_CHANGE";
    const showReason = draftType === "DISMISSAL" || draftType === "VACATION_OF_POST";

    return (
        <Box>
            {/* Timeline cards */}
            {events.length > 0 && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {events.map((event, index) => (
                        <Paper
                            key={`${event.actionType}-${event.actionDate}-${index}`}
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5
                            }}
                        >
                            <Chip
                                size="small"
                                color={
                                    event.actionType === "NEW_APPOINTMENT"
                                        ? "primary"
                                        : TERMINAL_TYPES.includes(event.actionType)
                                            ? "error"
                                            : "default"
                                }
                                label={`${index + 1}. ${getActionTypeLabel(event) || event.actionType}`}
                            />
                            {event.autoCreated && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label="Auto-created"
                                />
                            )}
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600}>
                                    {formatDisplayDate(event.actionDate)}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                >
                                    {eventSummary(
                                        event,
                                        designations,
                                        serviceLevels
                                    ) || event.remarks || "—"}
                                </Typography>
                            </Box>
                            {index === lastRemovableIndex && lastRemovableIndex >= 0 && (
                                <Tooltip title="Remove this event">
                                    <IconButton
                                        size="small"
                                        onClick={removeLastEvent}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Paper>
                    ))}
                </Stack>
            )}

            {/* First appointment entry */}
            {!hasFirstAppointment && (
                <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                        First Appointment
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <DateInput
                                {...fieldProps}
                                onChange={handleFirstDraftChange}
                                label="First Appointment Date"
                                name="actionDate"
                                value={firstDraft.actionDate}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                onChange={handleFirstDraftChange}
                                label="First Designation"
                                name="designationId"
                                value={firstDraft.designationId}
                                helperText={requiredServiceLevelHelper(
                                    firstDraftDesignation
                                )}
                                slotProps={{
                                    ...selectFieldProps.slotProps,
                                    select: {
                                        ...selectFieldProps.slotProps?.select,
                                        renderValue: (value) =>
                                            renderDesignationSelectValue(
                                                value,
                                                designations
                                            )
                                    }
                                }}
                            >
                                {designations.map((designation) => (
                                    <MenuItem
                                        key={designation.id}
                                        value={designation.id}
                                    >
                                        <DesignationOptionContent
                                            designation={designation}
                                        />
                                    </MenuItem>
                                ))}
                                <MenuItem value={OTHER_DESIGNATION_VALUE}>
                                    Other (type historical title)
                                </MenuItem>
                            </TextField>
                        </Grid>
                        {showSpecialDesignationField("first") && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleFirstDraftChange}
                                    label="Special designation (optional)"
                                    name="specialDesignationName"
                                    value={firstDraft.specialDesignationName}
                                    helperText="Shown on profile and history; reports use the designation above"
                                />
                            </Grid>
                        )}
                        {showOtherDesignationFields("first") && (
                            <>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        {...fieldProps}
                                        onChange={handleFirstDraftChange}
                                        label="Designation title (as recorded)"
                                        name="recordedDesignationName"
                                        value={firstDraft.recordedDesignationName}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        {...selectFieldProps}
                                        onChange={handleFirstDraftChange}
                                        label="Service"
                                        name="serviceId"
                                        value={firstDraft.serviceId}
                                    >
                                        {services.map((service) => (
                                            <MenuItem key={service.id} value={service.id}>
                                                {service.serviceCode} — {service.description}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </>
                        )}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                onChange={handleFirstDraftChange}
                                label="Service Level"
                                name="serviceLevelId"
                                value={firstDraft.serviceLevelId}
                                error={Boolean(firstDraftAssignmentError)}
                                helperText={
                                    firstDraftAssignmentError
                                    || (showOtherDesignationFields("first")
                                        ? "Select the senior service level for this era"
                                        : requiredServiceLevelHelper(firstDraftDesignation))
                                }
                            >
                                {firstDraftServiceLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.levelName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <DepartmentOfficeFields
                            departmentType={firstDraft.departmentType}
                            otherDepartmentName={firstDraft.otherDepartmentName}
                            district={firstDraft.district}
                            office={firstDraft.office}
                            onDepartmentTypeChange={(value) =>
                                setFirstDraft((prev) => ({
                                    ...prev,
                                    departmentType: value,
                                    district: "",
                                    office: ""
                                }))
                            }
                            onOtherDepartmentNameChange={(value) =>
                                setFirstDraft((prev) => ({
                                    ...prev,
                                    otherDepartmentName: value
                                }))
                            }
                            onDistrictChange={(value) =>
                                setFirstDraft((prev) => ({
                                    ...prev,
                                    district: value,
                                    office: ""
                                }))
                            }
                            onOfficeChange={(value) =>
                                setFirstDraft((prev) => ({ ...prev, office: value }))
                            }
                        />
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField
                                {...fieldProps}
                                onChange={handleFirstDraftChange}
                                label="Remarks (optional)"
                                name="remarks"
                                value={firstDraft.remarks}
                            />
                        </Grid>
                        <Grid
                            size={{ xs: 12, sm: 4 }}
                            sx={{ display: "flex", alignItems: "center" }}
                        >
                            <Button
                                variant="contained"
                                onClick={addFirstAppointment}
                                fullWidth
                            >
                                Add First Appointment
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Subsequent career events */}
            {hasFirstAppointment && availableActionTypes.length > 0 && (
                <Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                        Add Career Event
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                {...selectFieldProps}
                                onChange={handleEventDraftChange}
                                label="Event Type"
                                name="actionType"
                                value={eventDraft.actionType}
                            >
                                {availableActionTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {ACTION_TYPE_LABELS[type]}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <DateInput
                                {...fieldProps}
                                onChange={handleEventDraftChange}
                                label="Event Date"
                                name="actionDate"
                                value={eventDraft.actionDate}
                                error={eventDraftDateTooEarly}
                                helperText={eventDraftDateHelperText}
                                slotProps={{
                                    htmlInput: eventDraftMinDate
                                        ? { min: eventDraftMinDate }
                                        : undefined
                                }}
                            />
                        </Grid>
                        {showDesignationField && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    onChange={handleEventDraftChange}
                                    label={designationFieldLabel}
                                    name="designationId"
                                    value={eventDraft.designationId}
                                    helperText={
                                        draftType === "TRANSFER_OUT"
                                            ? (requiredServiceLevelHelper(
                                                eventDraftDesignation
                                            ) || "Same service; grade stays unchanged")
                                            : (requiredServiceLevelHelper(
                                                eventDraftDesignation
                                            ) || "Same service only")
                                    }
                                    slotProps={{
                                        ...selectFieldProps.slotProps,
                                        select: {
                                            ...selectFieldProps.slotProps?.select,
                                            renderValue: (value) =>
                                                renderDesignationSelectValue(
                                                    value,
                                                    promotionDesignations
                                                )
                                        }
                                    }}
                                >
                                    {promotionDesignations.map((designation) => (
                                        <MenuItem
                                            key={designation.id}
                                            value={designation.id}
                                        >
                                            <DesignationOptionContent
                                                designation={designation}
                                            />
                                        </MenuItem>
                                    ))}
                                    <MenuItem value={OTHER_DESIGNATION_VALUE}>
                                        Other (type historical title)
                                    </MenuItem>
                                </TextField>
                            </Grid>
                        )}
                        {showDesignationField && showSpecialDesignationField("event") && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Special designation (optional)"
                                    name="specialDesignationName"
                                    value={eventDraft.specialDesignationName}
                                    helperText="Shown on profile and history; reports use the designation above"
                                />
                            </Grid>
                        )}
                        {showDesignationField && showOtherDesignationFields("event") && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Designation title (as recorded)"
                                    name="recordedDesignationName"
                                    value={eventDraft.recordedDesignationName}
                                />
                            </Grid>
                        )}
                        {showGradeField && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Grade / Class"
                                    name="grade"
                                    value={eventDraft.grade}
                                    error={
                                        showGradeField
                                        && Boolean(eventDraftAssignmentError)
                                    }
                                    helperText={
                                        showGradeField && eventDraftAssignmentError
                                            ? eventDraftAssignmentError
                                            : "One step at a time"
                                    }
                                >
                                    {nextGradeOptions(state.grade, serviceAllowedGrades).map((grade) => (
                                        <MenuItem key={grade} value={grade}>
                                            {grade}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                        {showServiceLevelField && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Service Level (optional)"
                                    name="serviceLevelId"
                                    value={eventDraft.serviceLevelId}
                                    error={Boolean(eventDraftAssignmentError)}
                                    helperText={
                                        eventDraftAssignmentError
                                        || (showOtherDesignationFields("event")
                                            ? "Select the senior service level for this era"
                                            : requiredServiceLevelHelper(
                                                eventDraftDesignation || currentDesignation
                                            ))
                                        || "Set when the designation requires a different level"
                                    }
                                >
                                    {eventDraftServiceLevels.map((level) => (
                                        <MenuItem key={level.id} value={level.id}>
                                            {level.levelName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                        {showPromotionOutcome && (
                            <Grid size={{ xs: 12 }}>
                                <FormControl component="fieldset" required>
                                    <FormLabel component="legend">
                                        Promotion outcome
                                    </FormLabel>
                                    <RadioGroup
                                        name="promotionOutcome"
                                        value={eventDraft.promotionOutcome}
                                        onChange={handleEventDraftChange}
                                    >
                                        <FormControlLabel
                                            value="staying"
                                            control={<Radio />}
                                            label={`Stays in ${getPrimaryDepartmentName()}`}
                                        />
                                        <FormControlLabel
                                            value="transferringOut"
                                            control={<Radio />}
                                            label="Transfers out of department"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </Grid>
                        )}
                        {showPromotionTransferDestination && (
                            <DepartmentOfficeFields
                                departmentType={eventDraft.toDepartmentType}
                                otherDepartmentName={eventDraft.toOtherDepartmentName}
                                district={eventDraft.toDistrict}
                                office={eventDraft.toOffice}
                                excludeNwpDepartment
                                onDepartmentTypeChange={(value) =>
                                    setEventDraft((prev) => ({
                                        ...prev,
                                        toDepartmentType: value,
                                        toDistrict: "",
                                        toOffice: ""
                                    }))
                                }
                                onOtherDepartmentNameChange={(value) =>
                                    setEventDraft((prev) => ({
                                        ...prev,
                                        toOtherDepartmentName: value
                                    }))
                                }
                                onDistrictChange={(value) =>
                                    setEventDraft((prev) => ({
                                        ...prev,
                                        toDistrict: value,
                                        toOffice: ""
                                    }))
                                }
                                onOfficeChange={(value) =>
                                    setEventDraft((prev) => ({ ...prev, toOffice: value }))
                                }
                                departmentLabel="Destination department"
                                officeLabel="Destination office"
                            />
                        )}
                        {showTransferDestination && (
                            <>
                                <ReadonlyWorkplaceFields
                                    department={state.currentDepartment}
                                    office={state.currentOffice}
                                    district={state.currentDistrictOfWorking}
                                />
                                <DepartmentOfficeFields
                                    departmentType={eventDraft.toDepartmentType}
                                    otherDepartmentName={eventDraft.toOtherDepartmentName}
                                    district={eventDraft.toDistrict}
                                    office={eventDraft.toOffice}
                                    onDepartmentTypeChange={(value) =>
                                        setEventDraft((prev) => ({
                                            ...prev,
                                            toDepartmentType: value,
                                            toDistrict: "",
                                            toOffice: ""
                                        }))
                                    }
                                    onOtherDepartmentNameChange={(value) =>
                                        setEventDraft((prev) => ({
                                            ...prev,
                                            toOtherDepartmentName: value
                                        }))
                                    }
                                    onDistrictChange={(value) =>
                                        setEventDraft((prev) => ({
                                            ...prev,
                                            toDistrict: value,
                                            toOffice: ""
                                        }))
                                    }
                                    onOfficeChange={(value) =>
                                        setEventDraft((prev) => ({ ...prev, toOffice: value }))
                                    }
                                    departmentLabel="Transfer To — Department"
                                    officeLabel="Transfer To — Office"
                                />
                            </>
                        )}
                        {showOfficeChangeField && (
                            <>
                                <ReadonlyWorkplaceFields
                                    department={state.currentDepartment}
                                    office={state.currentOffice}
                                    district={state.currentDistrictOfWorking}
                                />
                                <DepartmentOfficeFields
                                    departmentType={
                                        isPrimaryDepartment(state.currentDepartment)
                                            ? DEPARTMENT_OPTIONS.NWP
                                            : DEPARTMENT_OPTIONS.OTHER
                                    }
                                    otherDepartmentName={
                                        isPrimaryDepartment(state.currentDepartment)
                                            ? ""
                                            : state.currentDepartment || ""
                                    }
                                    district={eventDraft.district}
                                    office={eventDraft.office}
                                    onDepartmentTypeChange={() => {}}
                                    onOtherDepartmentNameChange={() => {}}
                                    onDistrictChange={(value) =>
                                        setEventDraft((prev) => ({
                                            ...prev,
                                            district: value,
                                            office: ""
                                        }))
                                    }
                                    onOfficeChange={(value) =>
                                        setEventDraft((prev) => ({ ...prev, office: value }))
                                    }
                                    departmentReadOnly
                                    showDepartment={isPrimaryDepartment(state.currentDepartment)}
                                    officeLabel="New Office"
                                />
                            </>
                        )}
                        {showReason && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Reason"
                                    name="reason"
                                    value={eventDraft.reason}
                                />
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField
                                {...fieldProps}
                                onChange={handleEventDraftChange}
                                label="Remarks (optional)"
                                name="remarks"
                                value={eventDraft.remarks}
                            />
                        </Grid>
                        <Grid
                            size={{ xs: 12, sm: 4 }}
                            sx={{ display: "flex", alignItems: "center" }}
                        >
                            <Button
                                variant="outlined"
                                onClick={addEvent}
                                disabled={!canAddEvent}
                                fullWidth
                            >
                                Add Event
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Current state preview */}
            {hasFirstAppointment && (
                <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 1 }}
                    >
                        Current state after this history
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ flexWrap: "wrap" }}>
                        <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={`Designation: ${currentDesignation?.designationName || "—"}`}
                        />
                        <Chip
                            size="small"
                            variant="outlined"
                            label={`Grade: ${state.grade || "—"}`}
                        />
                        <Chip
                            size="small"
                            variant="outlined"
                            label={`Service level: ${
                                serviceLevels.find(
                                    (l) => l.id === Number(state.serviceLevelId)
                                )?.levelName || "—"
                            }`}
                        />
                        <Chip
                            size="small"
                            color={state.active ? "success" : "error"}
                            label={state.active ? "Active" : "Inactive"}
                        />
                        {state.permanentConfirmed && (
                            <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label={`Permanent since ${formatDisplayDate(state.permanentConfirmationDate)}`}
                            />
                        )}
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
