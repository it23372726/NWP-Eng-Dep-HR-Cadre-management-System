import {
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    CircularProgress
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
    generateCadreReport,
    downloadCadreReportExcel,
    downloadCadreReportPdf,
    triggerDownload
} from "../services/cadreReportService";
import { getApiErrorMessage } from "../constants/hrms";

const formatDate = (date) => date.toISOString().split("T")[0];

const startOfYear = () => formatDate(new Date(new Date().getFullYear(), 0, 1));

const STORAGE_KEY = "hrms.cadreReport.state.v1";

/** Government report style: DD.MM.YYYY */
export function formatDisplayDate(isoDate) {
    if (!isoDate) {
        return "";
    }
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
}

const PREFIX_COLUMNS = [
    { key: "serialNo", label: "S/N", align: "center" },
    { key: "designationName", label: "Designation", align: "left" },
    { key: "serviceCode", label: "Service", align: "center" },
    { key: "gradeClassDisplay", label: "Grade/Class", align: "center" },
    { key: "salaryCode", label: "Salary Code", align: "center" },
    { key: "serviceLevelName", label: "Service Level", align: "center" },
    { key: "finalApprovedCadre", label: "Final Approved Cadre", numeric: true }
];

const CHANGES_COLUMNS = [
    { key: "transferIn", label: "Transfer IN", numeric: true },
    { key: "transferOut", label: "Transfer OUT", numeric: true },
    { key: "retiredResignation", label: "Retired/Resignation", numeric: true },
    { key: "deaths", label: "Deaths", numeric: true },
    { key: "promotionsIn", label: "Promotion", numeric: true },
    { key: "newAppointments", label: "New Appointment", numeric: true },
    { key: "dismissals", label: "Dismissals", numeric: true },
    { key: "vacationOfPost", label: "Vacation of Post", numeric: true }
];

const SUFFIX_COLUMNS = [
    { key: "permanent", label: "Permanent", numeric: true },
    { key: "vacancies", label: "Vacancies", numeric: true },
    { key: "excess", label: "Excess", numeric: true },
    { key: "casual", label: "Casual", numeric: true },
    { key: "substitute", label: "Substitute", numeric: true },
    { key: "contracts", label: "Contracts", numeric: true },
    {
        key: "totalStaff",
        label: "Total (Per + Cas + Sub + Cont)",
        numeric: true
    }
];

const HEADER_ROW_SPAN = 3;

const ALL_COLUMNS = [
    ...PREFIX_COLUMNS,
    { key: "employeesAtStartDate", label: "", numeric: true },
    ...CHANGES_COLUMNS,
    ...SUFFIX_COLUMNS
];

const headerCellSx = {
    fontWeight: 700,
    fontSize: "0.7rem",
    bgcolor: "grey.200",
    border: "1px solid",
    borderColor: "divider",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    textAlign: "center"
};

function ReportTableRow({ row, isTotal }) {
    return (
        <TableRow
            sx={{
                bgcolor: isTotal ? "action.selected" : "inherit",
                "& td": {
                    fontWeight: isTotal ? 700 : 400,
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    border: "1px solid",
                    borderColor: "divider",
                    textAlign: "center"
                }
            }}
        >
            {ALL_COLUMNS.map((col) => (
                <TableCell
                    key={col.key}
                    align={
                        col.key === "designationName" ? "left" : col.align || "center"
                    }
                >
                    {col.numeric
                        ? row[col.key] ?? 0
                        : row[col.key] ?? (isTotal ? "" : "—")}
                </TableCell>
            ))}
        </TableRow>
    );
}

function CadreReportTableHead({ startDate, endDate }) {
    const employeesAtLabel = `No of Employees as at ${formatDisplayDate(startDate)}`;
    const changesGroupLabel = `Changes Between ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
    const particularsLabel = `Particulars as at ${formatDisplayDate(endDate)}`;

    return (
        <TableHead>
            <TableRow>
                {PREFIX_COLUMNS.map((col) => (
                    <TableCell
                        key={col.key}
                        rowSpan={HEADER_ROW_SPAN}
                        align={col.align || "center"}
                        sx={headerCellSx}
                    >
                        {col.label}
                    </TableCell>
                ))}

                <TableCell rowSpan={HEADER_ROW_SPAN} sx={headerCellSx}>
                    {employeesAtLabel}
                </TableCell>

                <TableCell
                    colSpan={CHANGES_COLUMNS.length}
                    sx={{
                        ...headerCellSx,
                        fontSize: "0.75rem",
                        letterSpacing: 0.2
                    }}
                >
                    {changesGroupLabel}
                </TableCell>

                <TableCell
                    colSpan={SUFFIX_COLUMNS.length}
                    sx={{
                        ...headerCellSx,
                        fontSize: "0.75rem",
                        letterSpacing: 0.2
                    }}
                >
                    {particularsLabel}
                </TableCell>
            </TableRow>

            <TableRow>
                {CHANGES_COLUMNS.map((col) => (
                    <TableCell key={col.key} rowSpan={2} sx={headerCellSx}>
                        {col.label}
                    </TableCell>
                ))}

                <TableCell
                    colSpan={SUFFIX_COLUMNS.length}
                    sx={headerCellSx}
                >
                    Existing cadre
                </TableCell>
            </TableRow>

            <TableRow>
                {SUFFIX_COLUMNS.map((col) => (
                    <TableCell key={col.key} sx={headerCellSx}>
                        {col.label}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

export default function CadreReportPage() {
    const [startDate, setStartDate] = useState(startOfYear());
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (parsed?.startDate) {
                setStartDate(parsed.startDate);
            }
            if (parsed?.endDate) {
                setEndDate(parsed.endDate);
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
                JSON.stringify({ startDate, endDate, report })
            );
        } catch {
            // ignore quota / storage failures
        }
    }, [startDate, endDate, report]);

    const periodStart = report?.startDate ?? startDate;
    const periodEnd = report?.endDate ?? endDate;

    const allRows = useMemo(
        () =>
            report
                ? [...report.rows, ...(report.totals ? [report.totals] : [])]
                : [],
        [report]
    );

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            toast.error("Please select both dates");
            return;
        }

        if (startDate > endDate) {
            toast.error("Start date must be before end date");
            return;
        }

        setLoading(true);

        try {
            const data = await generateCadreReport(startDate, endDate);
            setReport(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await downloadCadreReportExcel(startDate, endDate);
            triggerDownload(blob, `cadre-report-${startDate}-${endDate}.xlsx`);
            toast.success("Excel downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleExportPdf = async () => {
        try {
            const blob = await downloadCadreReportPdf(startDate, endDate);
            triggerDownload(blob, `cadre-report-${startDate}-${endDate}.pdf`);
            toast.success("PDF downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    return (
        <Container maxWidth={false} className="cadre-report-page" sx={{ pb: 4 }}>
            <Box className="cadre-report-header" sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Cadre Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    North Western Provincial Council — Engineering Department
                </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }} className="no-print">
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1
                    }}
                >
                    <TextField
                        label="Start Date"
                        type="date"
                        size="small"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        slotProps={{
                            inputLabel: { shrink: true }
                        }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        size="small"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        slotProps={{
                            inputLabel: { shrink: true }
                        }}
                    />
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
            </Paper>

            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {report && !loading && (
                <Paper
                    sx={{ p: 2 }}
                    className="cadre-report-print-area"
                    id="cadre-report-print"
                >
                    <Box sx={{ mb: 2 }} className="print-only-meta">
                        <Typography variant="h6" align="center">
                            Cadre Report — N.W.P. Engineering Department
                        </Typography>
                        <Typography variant="body2" align="center">
                            Period: {formatDisplayDate(periodStart)} to{" "}
                            {formatDisplayDate(periodEnd)}
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
                            <CadreReportTableHead
                                startDate={periodStart}
                                endDate={periodEnd}
                            />
                            <TableBody>
                                {allRows.map((row, index) => (
                                    <ReportTableRow
                                        key={row.designationId ?? `total-${index}`}
                                        row={row}
                                        isTotal={row.totalsRow}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {!report && !loading && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        Select a date range and click Generate Report.
                    </Typography>
                </Paper>
            )}

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    .cadre-report-print-area,
                    .cadre-report-print-area * { visibility: visible; }
                    .cadre-report-print-area {
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
