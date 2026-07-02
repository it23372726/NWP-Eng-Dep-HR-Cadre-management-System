import {
    Alert,
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    Typography
} from "@mui/material";
import AuditTrailChangeTable from "./AuditTrailChangeTable";
import FormSection from "./FormSection";
import {
    AUDIT_ACTION_COLORS,
    AUDIT_STATUS_COLORS,
    formatAuditAction,
    formatAuditModule,
    formatAuditStatus,
    formatAuditTimestamp,
    formatActivitySummary,
    formatResourceMeta,
    formatResourceSummary
} from "../utils/auditLogDisplay";

function DetailField({ label, value, mono = false }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontFamily: mono ? "monospace" : "inherit",
                    fontSize: mono ? "0.8rem" : "inherit",
                    wordBreak: "break-word"
                }}
            >
                {value ?? "—"}
            </Typography>
        </Box>
    );
}

function DetailSection({ title, description, children }) {
    return (
        <FormSection title={title} description={description}>
            <Grid container spacing={2}>
                {children}
            </Grid>
        </FormSection>
    );
}

function DetailGridItem({ children, size = { xs: 12, sm: 6, md: 4 } }) {
    return <Grid size={size}>{children}</Grid>;
}

export default function AuditTrailDetailDialog({ open, log, onClose }) {
    if (!log) {
        return null;
    }

    const resourceMeta = formatResourceMeta(log);
    const activitySummary = formatActivitySummary(log);
    const hasChanges = Boolean(
        log.changedFields?.length
        || Object.keys(log.oldValues || {}).length
        || Object.keys(log.newValues || {}).length
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Audit Event #{log.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formatAuditTimestamp(log.occurredAt)}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {activitySummary !== "—" && (
                            <Chip
                                size="small"
                                label={activitySummary}
                                color="primary"
                            />
                        )}
                        <Chip
                            size="small"
                            label={formatAuditAction(log.action)}
                            color={AUDIT_ACTION_COLORS[log.action] || "default"}
                            variant={activitySummary !== "—" ? "outlined" : "filled"}
                        />
                        <Chip
                            size="small"
                            label={formatAuditStatus(log.status)}
                            color={AUDIT_STATUS_COLORS[log.status] || "default"}
                            variant="outlined"
                        />
                        {log.sensitive && (
                            <Chip size="small" label="Sensitive" color="warning" variant="outlined" />
                        )}
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={0}>
                    {log.failureReason && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {log.failureReason}
                        </Alert>
                    )}

                    <DetailSection
                        title="Event"
                        description="What happened and under which application module."
                    >
                        <DetailGridItem size={{ xs: 12, md: 6 }}>
                            <DetailField
                                label="Activity"
                                value={
                                    activitySummary !== "—"
                                        ? activitySummary
                                        : formatAuditAction(log.action)
                                }
                            />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="System Event" value={formatAuditAction(log.action)} />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Module" value={formatAuditModule(log.sourceModule)} />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Outcome" value={formatAuditStatus(log.status)} />
                        </DetailGridItem>
                        {log.exportFormat && (
                            <DetailGridItem>
                                <DetailField label="Export Format" value={log.exportFormat} />
                            </DetailGridItem>
                        )}
                        {log.recordCount != null && (
                            <DetailGridItem>
                                <DetailField label="Records Affected" value={String(log.recordCount)} />
                            </DetailGridItem>
                        )}
                    </DetailSection>

                    <DetailSection
                        title="Actor"
                        description="Who performed the action."
                    >
                        <DetailGridItem>
                            <DetailField label="Username" value={log.username} />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Role" value={log.userRole} />
                        </DetailGridItem>
                    </DetailSection>

                    <DetailSection
                        title="Resource"
                        description="Which record or object was affected."
                    >
                        <DetailGridItem size={{ xs: 12, md: 6 }}>
                            <DetailField label="Resource" value={log.entityLabel || formatResourceSummary(log)} />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Resource Type" value={log.entityType} />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Resource ID" value={log.entityId} mono />
                        </DetailGridItem>
                        {resourceMeta && (
                            <DetailGridItem size={{ xs: 12 }}>
                                <DetailField label="Reference" value={resourceMeta} mono />
                            </DetailGridItem>
                        )}
                    </DetailSection>

                    <DetailSection
                        title="Request Context"
                        description="Where the request originated (source IP is the primary identifier)."
                    >
                        <DetailGridItem>
                            <DetailField label="Source IP" value={log.ipAddress} mono />
                        </DetailGridItem>
                        <DetailGridItem>
                            <DetailField label="Client Host" value={log.clientHost || "Not reported"} />
                        </DetailGridItem>
                        <DetailGridItem size={{ xs: 12 }}>
                            <DetailField label="User Agent" value={log.userAgent} />
                        </DetailGridItem>
                        <DetailGridItem size={{ xs: 12, md: 8 }}>
                            <DetailField
                                label="Request"
                                value={
                                    log.httpMethod || log.requestPath
                                        ? `${log.httpMethod || ""} ${log.requestPath || ""}`.trim()
                                        : "—"
                                }
                                mono
                            />
                        </DetailGridItem>
                    </DetailSection>

                    <DetailSection
                        title="Integrity & Traceability"
                        description="Correlation and tamper-evidence metadata for this immutable record."
                    >
                        <DetailGridItem size={{ xs: 12, md: 6 }}>
                            <DetailField label="Correlation ID" value={log.correlationId} mono />
                        </DetailGridItem>
                        <DetailGridItem size={{ xs: 12, md: 6 }}>
                            <DetailField label="Integrity Hash" value={log.contentHash} mono />
                        </DetailGridItem>
                    </DetailSection>

                    {hasChanges && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                Activity Details
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Structured details for this activity. Passwords and binary photo data are never stored.
                            </Typography>
                            <AuditTrailChangeTable
                                oldValues={log.oldValues}
                                newValues={log.newValues}
                                changedFields={log.changedFields}
                            />
                        </Box>
                    )}

                    {!hasChanges && log.action !== "LOGIN" && log.action !== "LOGOUT" && (
                        <Box sx={{ mt: 2 }}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                No structured field changes are associated with this event type.
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
