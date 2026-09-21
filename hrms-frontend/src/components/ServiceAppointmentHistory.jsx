import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function ServiceAppointmentHistory({ employee }) {
    // Superseded rows exist only to preserve requirement results behind a revision; they are not
    // appointments the employee held, so listing them here would not match the lifecycle history.
    const periods = (employee?.serviceAppointments || []).filter(p => !p.superseded);
    if (!periods.length) return null;
    return <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Service appointments</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Original career appointment: {employee.originalFirstAppointmentDate || "Not recorded"}.
            Each appointment keeps its own confirmation and requirement results.
        </Typography>
        {periods.map(p => <Accordion key={p.appointmentKey} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                    <Typography>{p.serviceCode} — {p.entryDesignationName}</Typography>
                    <Chip size="small" label={p.currentAppointment ? "Current" : "Previous"}
                        color={p.currentAppointment ? "primary" : "default"} />
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={1}>
                    <Typography variant="body2">Appointed: {p.startDate || "Not recorded"}{p.endDate ? ` · Next appointment effective: ${p.endDate}` : ""}</Typography>
                    <Typography variant="body2">Permanent confirmation: {p.permanentConfirmationDate || "Not recorded"}</Typography>
                    {[["Grade II", p.grade2AchievedDate], ["Grade I", p.grade1AchievedDate], ["Supra", p.supraAchievedDate], ["Special", p.specialAchievedDate]]
                        .filter(([, date]) => date).map(([grade, date]) => <Typography key={grade} variant="body2">{grade} achieved: {date}</Typography>)}
                    {p.probationEndDate && <Typography variant="body2">Earliest confirmation: {p.probationEndDate}, subject to requirements</Typography>}
                    {p.appointmentBasis && <Typography variant="body2">Examination passed: {p.appointmentBasis}</Typography>}
                    <Typography variant="body2">Increment date: {p.incrementDate || "Not recorded"}{p.firstIncrementDueDate ? ` · First due: ${p.firstIncrementDueDate}` : ""}</Typography>
                    {(p.requirements || []).map((r, i) => <Typography key={`${r.requirementType}-${r.requirementName}-${i}`} variant="body2">
                        {r.requirementName || r.requirementType}: {r.status}{r.completedDate ? ` (${r.completedDate})` : ""}{r.remarks ? ` — ${r.remarks}` : ""}
                    </Typography>)}
                </Stack>
            </AccordionDetails>
        </Accordion>)}
    </Box>;
}
