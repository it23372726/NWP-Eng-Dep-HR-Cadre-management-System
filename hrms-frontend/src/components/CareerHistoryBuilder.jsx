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
    Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useState } from "react";

import { ACTION_TYPE_LABELS } from "../constants/hrms";
import { createFormFieldProps } from "../utils/formLayout";
import {
    getServiceLevelsForDesignation,
    validateCareerHistoryDraftEvent,
    validateCareerHistoryEventAssignment
} from "../utils/employeeFormUtils";

const GRADE_SEQUENCE = ["III", "II", "I", "Supra", "Special"];

const TERMINAL_TYPES = [
    "TRANSFER_OUT",
    "RETIREMENT_OR_RESIGNATION",
    "DEATH",
    "DISMISSAL"
];

const emptyFirstAppointment = {
    actionDate: "",
    designationId: "",
    serviceLevelId: "",
    remarks: ""
};

const emptyEventDraft = {
    actionType: "",
    actionDate: "",
    designationId: "",
    grade: "",
    serviceLevelId: "",
    transferredFrom: "",
    transferredTo: "",
    reason: "",
    remarks: ""
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (date) => {
    if (!date) return "—";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
};

/**
 * Walks the timeline and derives the employee state after the last event.
 * Mirrors the backend replay/validator logic so the rest of the form can be
 * auto-filled from the timeline.
 */
export const deriveTimelineState = (events) => {
    let designationId = null;
    let grade = null;
    let serviceLevelId = null;
    let active = false;
    let permanentConfirmed = false;
    let permanentConfirmationDate = null;
    let deathRecorded = false;
    let lastDate = null;
    let firstAppointmentDate = null;

    events.forEach((event) => {
        switch (event.actionType) {
            case "NEW_APPOINTMENT":
                designationId = event.designationId;
                grade = event.grade || "III";
                firstAppointmentDate = event.actionDate;
                active = true;
                break;
            case "PERMANENT_CONFIRMATION":
                permanentConfirmed = true;
                permanentConfirmationDate = event.actionDate;
                break;
            case "PROMOTION":
            case "ASSIGNMENT_GRADE_UPDATE":
                if (event.designationId) {
                    designationId = event.designationId;
                }
                if (event.grade) {
                    grade = event.grade;
                }
                break;
            case "TRANSFER_IN":
                if (event.designationId) {
                    designationId = event.designationId;
                }
                active = true;
                break;
            case "TRANSFER_OUT":
            case "RETIREMENT_OR_RESIGNATION":
            case "DISMISSAL":
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
    });

    return {
        designationId,
        grade,
        serviceLevelId,
        active,
        permanentConfirmed,
        permanentConfirmationDate,
        deathRecorded,
        lastDate,
        firstAppointmentDate
    };
};

const nextGradeOptions = (currentGrade) => {
    const index = GRADE_SEQUENCE.indexOf(currentGrade);
    if (index < 0) {
        return GRADE_SEQUENCE;
    }
    return GRADE_SEQUENCE.slice(index, index + 2);
};

const eventSummary = (event, designations, serviceLevels) => {
    const parts = [];
    const designation = designations.find(
        (d) => d.id === Number(event.designationId)
    );
    if (designation) {
        parts.push(designation.designationName);
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

    const state = deriveTimelineState(events);
    const hasFirstAppointment = events.length > 0;

    const currentDesignation = designations.find(
        (d) => d.id === Number(state.designationId)
    );

    const availableActionTypes = (() => {
        if (state.deathRecorded) {
            return [];
        }
        if (!state.active) {
            return ["TRANSFER_IN"];
        }
        const types = [];
        if (state.grade === "III" && !state.permanentConfirmed) {
            types.push("PERMANENT_CONFIRMATION");
        }
        types.push("PROMOTION", "ASSIGNMENT_GRADE_UPDATE");
        types.push(...TERMINAL_TYPES);
        return types;
    })();

    const promotionDesignations = designations.filter(
        (d) =>
            currentDesignation?.service?.id
            && d.service?.id === currentDesignation.service.id
    );

    const firstDraftDesignation = designations.find(
        (item) => item.id === Number(firstDraft.designationId)
    );
    const eventDraftDesignation = designations.find(
        (item) => item.id === Number(eventDraft.designationId)
    );
    const firstDraftServiceLevels = getServiceLevelsForDesignation(
        firstDraftDesignation,
        serviceLevels
    );
    const eventDraftServiceLevels = getServiceLevelsForDesignation(
        eventDraftDesignation || currentDesignation,
        serviceLevels
    );

    const firstDraftAssignmentError =
        firstDraft.designationId && firstDraft.serviceLevelId
            ? validateCareerHistoryEventAssignment({
                designationId: firstDraft.designationId,
                grade: "III",
                serviceLevelId: firstDraft.serviceLevelId,
                effectiveServiceLevelId: firstDraft.serviceLevelId,
                designations,
                serviceLevels
            })
            : null;

    const eventDraftAssignmentError = validateCareerHistoryDraftEvent({
        actionType: eventDraft.actionType,
        designationId: eventDraft.designationId,
        grade: eventDraft.grade,
        serviceLevelId: eventDraft.serviceLevelId,
        timelineState: state,
        designations,
        serviceLevels
    });

    const handleFirstDraftChange = (e) => {
        const { name, value } = e.target;
        setFirstDraft((prev) => {
            let next = { ...prev, [name]: value };

            if (name === "designationId") {
                next = applyRequiredServiceLevel(next, value, designations);
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
                return {
                    ...emptyEventDraft,
                    actionType: value,
                    actionDate: prev.actionDate
                };
            }

            if (name === "designationId") {
                next = applyRequiredServiceLevel(next, value, designations);
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
        if (!firstDraft.serviceLevelId) {
            setError("First appointment service level is required");
            return;
        }

        const assignmentError = validateCareerHistoryEventAssignment({
            designationId: firstDraft.designationId,
            grade: "III",
            serviceLevelId: firstDraft.serviceLevelId,
            effectiveServiceLevelId: firstDraft.serviceLevelId,
            designations,
            serviceLevels
        });

        if (assignmentError) {
            setError(assignmentError);
            return;
        }

        onChange([
            {
                actionType: "NEW_APPOINTMENT",
                actionDate: firstDraft.actionDate,
                designationId: Number(firstDraft.designationId),
                grade: "III",
                serviceLevelId: Number(firstDraft.serviceLevelId),
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
        if (state.lastDate && eventDraft.actionDate < state.lastDate) {
            return `Event date cannot be before the previous event (${formatDisplayDate(state.lastDate)})`;
        }

        switch (eventDraft.actionType) {
            case "PROMOTION":
                if (!eventDraft.designationId) {
                    return "Promotion requires the new designation";
                }
                if (!eventDraft.grade) {
                    return "Promotion requires the grade";
                }
                break;
            case "ASSIGNMENT_GRADE_UPDATE":
                if (!eventDraft.grade) {
                    return "Grade update requires the new grade";
                }
                break;
            case "TRANSFER_OUT":
                if (!eventDraft.transferredTo?.trim()) {
                    return "Transfer out requires where the employee was transferred to";
                }
                break;
            case "DISMISSAL":
                if (!eventDraft.reason?.trim()) {
                    return "Dismissal requires a reason";
                }
                break;
            default:
                break;
        }

        const assignmentError = validateCareerHistoryDraftEvent({
            actionType: eventDraft.actionType,
            designationId: eventDraft.designationId,
            grade: eventDraft.grade,
            serviceLevelId: eventDraft.serviceLevelId,
            timelineState: state,
            designations,
            serviceLevels
        });

        if (assignmentError) {
            return assignmentError;
        }

        return "";
    };

    const addEvent = () => {
        const draftError = validateEventDraft();
        if (draftError) {
            setError(draftError);
            return;
        }

        const event = {
            actionType: eventDraft.actionType,
            actionDate: eventDraft.actionDate,
            designationId: eventDraft.designationId
                ? Number(eventDraft.designationId)
                : null,
            grade: eventDraft.grade || null,
            serviceLevelId: eventDraft.serviceLevelId
                ? Number(eventDraft.serviceLevelId)
                : null,
            transferredFrom: eventDraft.transferredFrom?.trim() || null,
            transferredTo: eventDraft.transferredTo?.trim() || null,
            reason: eventDraft.reason?.trim() || null,
            remarks: eventDraft.remarks?.trim() || null
        };

        onChange([...events, event]);
        setEventDraft(emptyEventDraft);
        setError("");
    };

    const removeLastEvent = () => {
        onChange(events.slice(0, -1));
        setError("");
    };

    const { fieldProps, dateFieldProps, selectFieldProps } =
        createFormFieldProps(() => {});

    const draftType = eventDraft.actionType;
    const showDesignationField = draftType === "PROMOTION";
    const showGradeField =
        draftType === "PROMOTION" || draftType === "ASSIGNMENT_GRADE_UPDATE";
    const showServiceLevelField =
        draftType === "PROMOTION" || draftType === "ASSIGNMENT_GRADE_UPDATE";
    const showTransferredFrom = draftType === "TRANSFER_IN";
    const showTransferredTo = draftType === "TRANSFER_OUT";
    const showReason = draftType === "DISMISSAL";

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
                                label={`${index + 1}. ${ACTION_TYPE_LABELS[event.actionType] || event.actionType}`}
                            />
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
                            {index === events.length - 1 && (
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
                            <TextField
                                {...dateFieldProps}
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
                                    || requiredServiceLevelHelper(
                                        firstDraftDesignation
                                    )
                                }
                            >
                                {firstDraftServiceLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.levelName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
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
                            <TextField
                                {...dateFieldProps}
                                onChange={handleEventDraftChange}
                                label="Event Date"
                                name="actionDate"
                                value={eventDraft.actionDate}
                            />
                        </Grid>
                        {showDesignationField && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...selectFieldProps}
                                    onChange={handleEventDraftChange}
                                    label="New Designation"
                                    name="designationId"
                                    value={eventDraft.designationId}
                                    helperText={
                                        requiredServiceLevelHelper(
                                            eventDraftDesignation
                                        ) || "Same service only"
                                    }
                                >
                                    {promotionDesignations.map((designation) => (
                                        <MenuItem
                                            key={designation.id}
                                            value={designation.id}
                                        >
                                            {designation.designationName}
                                        </MenuItem>
                                    ))}
                                </TextField>
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
                                    {nextGradeOptions(state.grade).map((grade) => (
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
                                        || requiredServiceLevelHelper(
                                            eventDraftDesignation
                                                || currentDesignation
                                        )
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
                        {showTransferredFrom && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Transferred From"
                                    name="transferredFrom"
                                    value={eventDraft.transferredFrom}
                                    placeholder="e.g. Irrigation Department"
                                />
                            </Grid>
                        )}
                        {showTransferredTo && (
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    {...fieldProps}
                                    onChange={handleEventDraftChange}
                                    label="Transferred To"
                                    name="transferredTo"
                                    value={eventDraft.transferredTo}
                                    placeholder="e.g. Irrigation Department"
                                />
                            </Grid>
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
