import { Paper, Typography, Button, Grid } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useNavigate } from "react-router-dom";

export default function QuickReportsSection() {
    const navigate = useNavigate();

    const reports = [
        { label: "Cadre Report", path: "/cadre-report", color: "#0F2A4A" },
        { label: "All Employees", path: "/reports/all-employee-details", color: "#17365C" },
        { label: "Vacancies", path: "/vacancies", color: "#334155" },
        { label: "Inactive Employees", path: "/employees/inactive", color: "#475569" }
    ];

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Quick Reports
            </Typography>
            <Grid container spacing={2}>
                {reports.map((report, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate(report.path)}
                            sx={{
                                py: 2,
                                borderColor: report.color,
                                color: report.color,
                                borderWidth: 2,
                                "&:hover": {
                                    borderWidth: 2,
                                    bgcolor: `${report.color}10`
                                }
                            }}
                            startIcon={<FileDownloadIcon />}
                        >
                            {report.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
}
