import {
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import { buildChangeRows } from "../utils/auditLogDisplay";

const CHANGE_TYPE_META = {
    added: { label: "Added", color: "success" },
    removed: { label: "Removed", color: "error" },
    modified: { label: "Modified", color: "warning" }
};

export default function AuditTrailChangeTable({ oldValues, newValues, changedFields }) {
    const rows = buildChangeRows(oldValues, newValues, changedFields);

    if (rows.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                No field-level changes recorded for this event.
            </Typography>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: "22%" }}>Field</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: "34%" }}>Previous Value</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: "34%" }}>New Value</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: "10%" }}>Change</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const meta = CHANGE_TYPE_META[row.changeType];
                        return (
                            <TableRow
                                key={row.field}
                                sx={{
                                    bgcolor: row.changed ? "action.hover" : "inherit"
                                }}
                            >
                                <TableCell sx={{ fontWeight: 600, verticalAlign: "top" }}>
                                    {row.label}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        verticalAlign: "top",
                                        fontFamily: row.oldValue.includes("\n") ? "monospace" : "inherit",
                                        fontSize: row.oldValue.includes("\n") ? "0.8rem" : "inherit"
                                    }}
                                >
                                    {row.oldValue}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        verticalAlign: "top",
                                        fontFamily: row.newValue.includes("\n") ? "monospace" : "inherit",
                                        fontSize: row.newValue.includes("\n") ? "0.8rem" : "inherit"
                                    }}
                                >
                                    {row.newValue}
                                </TableCell>
                                <TableCell sx={{ verticalAlign: "top" }}>
                                    {meta ? (
                                        <Chip size="small" label={meta.label} color={meta.color} />
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
