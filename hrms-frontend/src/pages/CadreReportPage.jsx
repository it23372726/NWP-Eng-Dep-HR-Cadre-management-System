import {
    Box,
    Button,
    CircularProgress,
    Container,
    Dialog,
    DialogContent,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
    generateCadreReport,
    downloadCadreReportExcel,
    downloadCadreReportPdf,
    printPdfBlob,
    triggerDownload
} from "../services/cadreReportService";
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";
import DateInput from "../components/DateInput";
import {
    getApiErrorMessage,
    getPrimaryDepartmentName,
    getReportHeaderSubtitle
} from "../constants/hrms";

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

/** Matches Excel cadre report dates: DD-MM-YYYY */
export function formatCadreDate(isoDate) {
    if (!isoDate) {
        return "";
    }
    const [year, month, day] = isoDate.split("-");
    return `${day}-${month}-${year}`;
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
    backgroundClip: "padding-box",
    border: "0.5px solid #94A3B8",
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
                    sx={{
                        whiteSpace:
                            col.key === "designationName" ? "normal" : "nowrap"
                    }}
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
        <TableHead
            sx={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                bgcolor: "grey.200",
                boxShadow: (theme) => `0 1px 0 0 ${theme.palette.divider}`,
                "& th": {
                    position: "static",
                    bgcolor: "grey.200",
                    backgroundClip: "padding-box",
                    border: "0.5px solid #94A3B8 !important"
                }
            }}
        >
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

function CadreReportTable({ rows, startDate, endDate }) {
    return (
        <Table
            size="small"
            sx={{
                borderCollapse: "separate",
                borderSpacing: 0
            }}
        >
            <CadreReportTableHead startDate={startDate} endDate={endDate} />
            <TableBody>
                {rows.map((row, index) => (
                    <ReportTableRow
                        key={row.designationId ?? `total-${index}`}
                        row={row}
                        isTotal={row.totalsRow}
                    />
                ))}
            </TableBody>
        </Table>
    );
}

export default function CadreReportPage() {
    const [startDate, setStartDate] = useState(startOfYear());
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [fullScreenOpen, setFullScreenOpen] = useState(false);

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

    const handlePrint = async () => {
        setPrinting(true);
        try {
            const blob = await downloadCadreReportPdf(startDate, endDate);
            await printPdfBlob(blob);
        } catch (error) {
            if (error?.code === "POPUP_BLOCKED") {
                toast.error("Allow pop-ups to print the PDF");
            } else {
                toast.error(getApiErrorMessage(error));
            }
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Container maxWidth={false} className="cadre-report-page" sx={{ pb: 4 }}>
            <Box className="cadre-report-header" sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Cadre Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {getReportHeaderSubtitle()}
                </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        alignItems: { xs: "stretch", sm: "flex-end" },
                        flexWrap: "wrap"
                    }}
                >
                    <DateInput
                        label="Start Date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        fullWidth={false}
                        sx={{ width: { xs: "100%", sm: 168 } }}
                    />
                    <DateInput
                        label="End Date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        fullWidth={false}
                        sx={{ width: { xs: "100%", sm: 168 } }}
                    />
                    <Stack
                        direction="row"
                        spacing={1}

                        useFlexGap
                        sx={{flexWrap: "wrap",  width: { xs: "100%", sm: "auto" } }}
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
                            disabled={!report || loading || printing}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportPdf}
                            disabled={!report || loading || printing}
                        >
                            Export PDF
                        </Button>
                        <Button
                            variant="text"
                            onClick={handlePrint}
                            disabled={!report || loading || printing}
                        >
                            {printing ? "Preparing print…" : "Print"}
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
                <Paper sx={{ p: 2 }}>
                    <Box
                        sx={{
                            mb: 2,
                            position: "relative",
                            pr: { sm: 16 }
                        }}
                    >
                        <Typography variant="h6" align="center">
                            Cadre Report — {getPrimaryDepartmentName()}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Period: {formatDisplayDate(periodStart)} to{" "}
                            {formatDisplayDate(periodEnd)}
                        </Typography>
                        <Typography variant="caption" align="center" sx={{ display: "block" }}>
                            Generated:{" "}
                            {new Date(report.generatedAt).toLocaleString()}
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<FullscreenRoundedIcon />}
                            onClick={() => setFullScreenOpen(true)}
                            sx={{
                                mt: { xs: 1.5, sm: 0 },
                                mx: { xs: "auto", sm: 0 },
                                display: "flex",
                                position: { sm: "absolute" },
                                right: { sm: 0 },
                                top: { sm: 0 }
                            }}
                        >
                            Full screen
                        </Button>
                    </Box>

                    <ResponsiveTableContainer
                        tableMinWidth={1200}
                        sx={{
                            maxHeight: "70vh",
                            overflow: "auto",
                            border: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <CadreReportTable
                            rows={allRows}
                            startDate={periodStart}
                            endDate={periodEnd}
                        />
                    </ResponsiveTableContainer>
                </Paper>
            )}

            {!report && !loading && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        Select a date range and click Generate Report.
                    </Typography>
                </Paper>
            )}

            <Dialog
                fullScreen
                open={fullScreenOpen}
                onClose={() => setFullScreenOpen(false)}
                aria-labelledby="cadre-full-screen-title"
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "grey.50",
                            backgroundImage: "none"
                        }
                    }
                }}
            >
                <Box
                    component="header"
                    sx={{
                        minHeight: 72,
                        px: { xs: 1.5, sm: 2.5 },
                        py: 1.25,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        bgcolor: "background.paper",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
                        flexShrink: 0,
                        zIndex: 1
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center", minWidth: 0 }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                display: { xs: "none", sm: "grid" },
                                placeItems: "center",
                                borderRadius: 2,
                                bgcolor: "primary.50",
                                color: "primary.main",
                                flexShrink: 0
                            }}
                        >
                            <FullscreenRoundedIcon />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                id="cadre-full-screen-title"
                                variant="h6"
                                noWrap
                                sx={{ fontWeight: 750, lineHeight: 1.25 }}
                            >
                                Cadre Report
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ display: "block" }}
                            >
                                {getPrimaryDepartmentName()} ·{" "}
                                {formatDisplayDate(periodStart)} to{" "}
                                {formatDisplayDate(periodEnd)}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PrintRoundedIcon />}
                            onClick={handlePrint}
                            disabled={printing}
                            sx={{ display: { xs: "none", sm: "inline-flex" } }}
                        >
                            {printing ? "Preparing…" : "Print PDF"}
                        </Button>
                        <Tooltip title="Close full screen">
                            <IconButton
                                onClick={() => setFullScreenOpen(false)}
                                aria-label="Close full-screen report"
                                sx={{
                                    bgcolor: "action.hover",
                                    "&:hover": { bgcolor: "action.selected" }
                                }}
                            >
                                <CloseRoundedIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                <DialogContent
                    sx={{
                        p: { xs: 1, sm: 2 },
                        minHeight: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <ResponsiveTableContainer
                        showScrollHint={false}
                        tableMinWidth={1200}
                        wrapperSx={{ flex: 1, minHeight: 0 }}
                        sx={{
                            height: "100%",
                            maxHeight: "none",
                            overflow: "auto",
                            bgcolor: "background.paper",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2
                        }}
                    >
                        <CadreReportTable
                            rows={allRows}
                            startDate={periodStart}
                            endDate={periodEnd}
                        />
                    </ResponsiveTableContainer>
                </DialogContent>
            </Dialog>
        </Container>
    );
}
