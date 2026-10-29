import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";

import RecordSalaryIncrementDialog from "../RecordSalaryIncrementDialog";
import FormSection from "../FormSection";
import { getSalaryIncrementHistory } from "../../services/salaryIncrementService";
import {
    buildSalaryIncrementPeriods,
    formatIncrementDay,
    formatSalaryIncrementDate,
    getSalaryIncrementStatusColor,
    replaySalaryIncrementDrafts,
    salaryIncrementPeriodKey,
    salaryIncrementPeriodLabel
} from "../../utils/salaryIncrement";

export default function SalaryIncrementEntrySection({
    events = [],
    incrementDate = "",
    appointmentDate = "",
    savedAppointments = [],
    employeeId = null,
    drafts = [],
    onChange,
    onDraftError
}) {
    const [savedRecords, setSavedRecords] = useState([]);
    const [selectedKey, setSelectedKey] = useState("CURRENT");
    const [dialogOpen, setDialogOpen] = useState(false);
    const periods = useMemo(
        () => buildSalaryIncrementPeriods({
            events,
            incrementDate,
            appointmentDate,
            savedAppointments
        }),
        [events, incrementDate, appointmentDate, savedAppointments]
    );
    const signature = periods
        .map((period) => [
            salaryIncrementPeriodKey(period),
            period.startDate,
            period.endDate,
            period.incrementDate,
            period.firstIncrementDueDate
        ].join("|"))
        .join(";");
    const signatureRef = useRef(signature);

    useEffect(() => {
        if (!employeeId) {
            setSavedRecords([]);
            return undefined;
        }
        let cancelled = false;
        getSalaryIncrementHistory(employeeId)
            .then((records) => {
                if (!cancelled) {
                    setSavedRecords(records || []);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSavedRecords([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [employeeId]);

    useEffect(() => {
        if (signatureRef.current === signature) {
            return;
        }
        signatureRef.current = signature;
        if (drafts.length) {
            onChange([]);
        }
    }, [signature, drafts.length, onChange]);

    const draftError = useMemo(() => {
        const message = periods
            .map((period) => replaySalaryIncrementDrafts(period, savedRecords, drafts).error)
            .find(Boolean);
        return message || "";
    }, [periods, savedRecords, drafts]);

    useEffect(() => {
        onDraftError?.(draftError);
    }, [draftError, onDraftError]);

    useEffect(() => () => onDraftError?.(""), [onDraftError]);

    const selected = periods.find((period) => salaryIncrementPeriodKey(period) === selectedKey)
        || periods.find((period) => period.current)
        || periods[0]
        || null;
    const preview = selected
        ? replaySalaryIncrementDrafts(selected, savedRecords, drafts)
        : null;
    const queuedForPeriod = drafts.filter(
        (draft) => selected && draft.periodKey === salaryIncrementPeriodKey(selected)
    );

    const recordDraft = (doneDate, { catchUpToCurrentYear = false, catchUpThroughYear } = {}) => {
        if (!selected) {
            return;
        }
        onChange([
            ...drafts,
            {
                doneDate,
                catchUpToCurrentYear, catchUpThroughYear,
                periodKey: salaryIncrementPeriodKey(selected),
                serviceAppointmentKey: selected.current ? null : selected.key
            }
        ]);
        setDialogOpen(false);
    };

    const removeLastQueued = () => {
        const identity = salaryIncrementPeriodKey(selected);
        const index = drafts.findLastIndex((draft) => draft.periodKey === identity);
        if (index < 0) {
            return;
        }
        onChange(drafts.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <FormSection
            title="Salary increments"
            description="Record increments that are already due. They are saved together with this employee."
        >
            {!selected && (
                <Alert severity="info">
                    Add the first appointment and the annual increment day before recording increments.
                </Alert>
            )}
            {selected && !selected.incrementDate && (
                <Alert severity="info">
                    Set the annual increment day before recording increments.
                </Alert>
            )}
            {selected?.incrementDate && preview && (
                <Stack spacing={1.5}>
                    {periods.length > 1 && (
                        <TextField
                            select
                            size="small"
                            label="Appointment period"
                            value={salaryIncrementPeriodKey(selected)}
                            onChange={(event) => setSelectedKey(event.target.value)}
                            helperText="Each appointment keeps its own increment schedule."
                        >
                            {periods.map((period) => (
                                <MenuItem
                                    key={salaryIncrementPeriodKey(period)}
                                    value={salaryIncrementPeriodKey(period)}
                                >
                                    {salaryIncrementPeriodLabel(period, periods.length)}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        {preview.status.applicable && (
                            <Chip
                                size="small"
                                color={getSalaryIncrementStatusColor(preview.status)}
                                label={preview.status.statusLabel}
                            />
                        )}
                        <Chip
                            size="small"
                            variant="outlined"
                            label={`Increment day ${formatIncrementDay(selected.incrementDate)}`}
                        />
                        {preview.status.nextDueDate && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Next due ${formatSalaryIncrementDate(preview.status.nextDueDate)}`}
                            />
                        )}
                    </Stack>
                    {preview.error && (
                        <Alert severity="warning">{preview.error}</Alert>
                    )}
                    {preview.lines.length > 0 && (
                        <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
                            <Stack spacing={0.5}>
                                {preview.lines.map((line, index) => (
                                    <Typography key={`${line.kind}-${line.label}-${index}`} variant="body2">
                                        {line.kind === "queued" ? "To save: " : ""}
                                        {line.label}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    )}
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={!preview.status.canRecordNow || Boolean(preview.error)}
                            onClick={() => setDialogOpen(true)}
                        >
                            Record increment
                        </Button>
                        {queuedForPeriod.length > 0 && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={removeLastQueued}
                            >
                                Remove last entry
                            </Button>
                        )}
                    </Stack>
                    {!preview.status.canRecordNow && preview.status.applicable && (
                        <Typography variant="body2" color="text.secondary">
                            {preview.status.nextDueDate
                                ? `The next increment can be recorded from ${formatSalaryIncrementDate(preview.status.nextDueDate)}.`
                                : "Every increment due so far is already recorded."}
                        </Typography>
                    )}
                </Stack>
            )}
            <RecordSalaryIncrementDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onConfirm={recordDraft}
                salaryIncrementStatus={preview?.status}
                employee={null}
            />
        </FormSection>
    );
}
