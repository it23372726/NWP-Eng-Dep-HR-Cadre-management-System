import {
    Box,
    Button,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
    generateChangesReport,
    downloadChangesReportExcel,
    downloadChangesReportPdf,
    triggerDownload
} from "../services/changesReportService";
import { formatDisplayDate } from "./CadreReportPage";
import { getApiErrorMessage } from "../constants/hrms";

const STORAGE_KEY = "hrms.changesReport.state.v1";

const MONTH_OPTIONS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
];

const COLUMNS = [
    { key: "serialNo", label: "No", align: "center" },
    { key: "fullName", label: "Full Name", align: "left" },
    { key: "designation", label: "Designation", align: "left" },
    { key: "nic", label: "NIC", align: "center" },
    { key: "employmentType", label: "Employment Type", align: "center" },
    { key: "action", label: "Action", align: "left" },
    { key: "actionDate", label: "Date", align: "center" }
];

const headerCellSx = {
    fontWeight: 700,
    fontSize: "0.75rem",
    bgcolor: "grey.200",
    border: "1px solid",
    borderColor: "divider",
    whiteSpace: "nowrap"
};

const YEAR_SELECT_MENU_PROPS = {
    slotProps: {
        paper: {
            sx: {
                maxHeight: 320,
                overflowY: "auto"
            }
        },
        list: {
            sx: {
                maxHeight: 320,
                overflowY: "auto"
            }
        }
    }
};

const FIRST_REPORT_YEAR = 1900;
const LAST_REPORT_YEAR = 2100;

function buildYearOptions() {
    const currentYear = new Date().getFullYear();
    const endYear = Math.min(currentYear + 1, LAST_REPORT_YEAR);
    const years = [];
    for (let optionYear = endYear; optionYear >= FIRST_REPORT_YEAR; optionYear -= 1) {
        years.push(optionYear);
    }
    return years;
}

function normalizeYear(value, yearOptions) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return new Date().getFullYear();
    }
    return yearOptions.includes(parsed)
        ? parsed
        : new Date().getFullYear();
}

export default function ChangesReportPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const yearOptions = useMemo(() => buildYearOptions(), []);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (parsed?.year) {
                setYear(normalizeYear(parsed.year, buildYearOptions()));
            }
            if (parsed?.month) {
                setMonth(parsed.month);
            }
            if (parsed?.report) {
                setReport(parsed.report);
            }
        } catch {
            // ignore corrupted storage
        }
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ year, month, report })
            );
        } catch {
            // ignore quota / storage failures
        }
    }, [year, month, report]);

    const periodLabel = report
        ? `${report.monthLabel} ${report.year}`
        : `${MONTH_OPTIONS.find((item) => item.value === month)?.label ?? ""} ${year}`;

    const handleGenerate = async () => {
        setLoading(true);

        try {
            const data = await generateChangesReport(year, month);
            setReport(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const exportFilenameBase = `changes-report-${year}-${String(month).padStart(2, "0")}`;

    const handleExportExcel = async () => {
        try {
            const blob = await downloadChangesReportExcel(year, month);
            triggerDownload(blob, `${exportFilenameBase}.xlsx`);
            toast.success("Excel downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleExportPdf = async () => {
        try {
            const blob = await downloadChangesReportPdf(year, month);
            triggerDownload(blob, `${exportFilenameBase}.pdf`);
            toast.success("PDF downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    return (
        <Container maxWidth={false} className="changes-report-page" sx={{ pb: 4 }}>
            <Box className="changes-report-header" sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Changes Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    North Western Provincial Council — Engineering Department
                </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }} className="no-print">
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        alignItems: { xs: "stretch", sm: "flex-end" },
                        flexWrap: "wrap"
                    }}
                >
                    <FormControl sx={{ width: { xs: "100%", sm: 140 } }}>
                        <InputLabel id="changes-report-year-label">Year</InputLabel>
                        <Select
                            labelId="changes-report-year-label"
                            label="Year"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            MenuProps={YEAR_SELECT_MENU_PROPS}
                        >
                            {yearOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl sx={{ width: { xs: "100%", sm: 180 } }}>
                        <InputLabel id="changes-report-month-label">Month</InputLabel>
                        <Select
                            labelId="changes-report-month-label"
                            label="Month"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {MONTH_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                        <Button
                            variant="contained"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? "Generating…" : "Generate Report"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportExcel}
                            disabled={!report || loading}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportPdf}
                            disabled={!report || loading}
                        >
                            Export PDF
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => window.print()}
                            disabled={!report}
                        >
                            Print
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {report && !loading && (
                <Paper
                    sx={{ p: 2 }}
                    className="changes-report-print-area"
                    id="changes-report-print"
                >
                    <Box sx={{ mb: 2 }} className="print-only-meta">
                        <Typography variant="h6" align="center">
                            Changes Report — N.W.P. Engineering Department
                        </Typography>
                        <Typography variant="body2" align="center">
                            Period: {periodLabel}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Total Changes: {report.totalCount ?? report.rows?.length ?? 0}
                        </Typography>
                        <Typography variant="caption" align="center" display="block">
                            Generated:{" "}
                            {new Date(report.generatedAt).toLocaleString()}
                        </Typography>
                    </Box>

                    <TableContainer
                        sx={{
                            maxHeight: "70vh",
                            border: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {COLUMNS.map((col) => (
                                        <TableCell
                                            key={col.key}
                                            align={col.align}
                                            sx={headerCellSx}
                                        >
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {report.rows?.length ? (
                                    report.rows.map((row) => (
                                        <TableRow key={`${row.serialNo}-${row.nic}-${row.actionDate}`}>
                                            {COLUMNS.map((col) => (
                                                <TableCell
                                                    key={col.key}
                                                    align={col.align}
                                                    sx={{
                                                        fontSize: "0.75rem",
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        whiteSpace: "nowrap"
                                                    }}
                                                >
                                                    {col.key === "actionDate"
                                                        ? formatDisplayDate(row.actionDate)
                                                        : row[col.key] ?? "—"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={COLUMNS.length}
                                            align="center"
                                            sx={{ py: 4 }}
                                        >
                                            No changes recorded for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {!report && !loading && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        Select a year and month, then click Generate Report.
                    </Typography>
                </Paper>
            )}

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    .changes-report-print-area,
                    .changes-report-print-area * { visibility: visible; }
                    .changes-report-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
        </Container>
    );
}
