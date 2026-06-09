import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Container,
    Stack,
    Button
} from "@mui/material";

import {
    useEffect,
    useState
} from "react";

import toast from "react-hot-toast";

import {
    getVacancyReport,
    downloadVacancyReportExcel,
    downloadVacancyReportPdf
} from "../services/cadreService";

const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

export default function VacancyReportPage() {

    const [report, setReport] =
        useState([]);

    useEffect(() => {

        loadReport();

    }, []);

    const loadReport = async () => {

        try {

            const data =
                await getVacancyReport();

            setReport(data);

        } catch (error) {

            toast.error(
                "Failed to load vacancy report"
            );
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await downloadVacancyReportExcel();
            triggerDownload(blob, "vacancy-excess-report.xlsx");
            toast.success("Excel downloaded");
        } catch {
            toast.error("Failed to export Excel");
        }
    };

    const handleExportPdf = async () => {
        try {
            const blob = await downloadVacancyReportPdf();
            triggerDownload(blob, "vacancy-excess-report.pdf");
            toast.success("PDF downloaded");
        } catch {
            toast.error("Failed to export PDF");
        }
    };

    return (

        <Container>

            <Typography
                variant="h4"
                gutterBottom
            >
                Cadre Vacancy & Excess Report
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button variant="outlined" onClick={handleExportExcel}>
                    Export Excel
                </Button>
                <Button variant="outlined" onClick={handleExportPdf}>
                    Export PDF
                </Button>
            </Stack>

            <TableContainer
                component={Paper}
            >

                <Table>

                    <TableHead>

                        <TableRow>

                            <TableCell>
                                Designation
                            </TableCell>

                            <TableCell>
                                Service
                            </TableCell>

                            <TableCell>
                                Service Level
                            </TableCell>

                            <TableCell>
                                Approved
                            </TableCell>

                            <TableCell>
                                Current
                            </TableCell>

                            <TableCell>
                                Vacancy
                            </TableCell>

                            <TableCell>
                                Excess
                            </TableCell>

                        </TableRow>

                    </TableHead>

                    <TableBody>

                        {report.map((row, index) => (

                            <TableRow
                                key={index}
                                sx={{
                                    fontWeight: row.totalsRow ? 700 : 400,
                                    bgcolor: row.totalsRow ? "action.selected" : "inherit"
                                }}
                            >

                                <TableCell>
                                    {
                                        row.designationName
                                    }
                                </TableCell>

                                <TableCell>
                                    {row.serviceCode || "—"}
                                </TableCell>

                                <TableCell>
                                    {row.serviceLevelName || "—"}
                                </TableCell>

                                <TableCell>
                                    {row.approvedCount}
                                </TableCell>

                                <TableCell>
                                    {
                                        row.currentCount
                                    }
                                </TableCell>

                                <TableCell
                                    sx={{
                                        color: row.vacancyCount > 0 ? "warning.main" : "inherit",
                                        fontWeight: row.vacancyCount > 0 ? 700 : 400
                                    }}
                                >
                                    {row.vacancyCount}
                                </TableCell>

                                <TableCell
                                    sx={{
                                        color: row.excessCount > 0 ? "error.main" : "inherit",
                                        fontWeight: row.excessCount > 0 ? 700 : 400
                                    }}
                                >
                                    {row.excessCount}
                                </TableCell>

                            </TableRow>
                        ))}

                    </TableBody>

                </Table>

            </TableContainer>

        </Container>
    );
}