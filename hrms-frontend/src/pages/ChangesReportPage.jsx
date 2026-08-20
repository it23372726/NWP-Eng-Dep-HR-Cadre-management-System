import {
    Box,
    Button,
    CircularProgress,
    Container,
    Dialog,
    DialogContent,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
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
    generateChangesReport,
    downloadChangesReportExcel,
    downloadChangesReportPdf,
    printPdfBlob,
    triggerDownload
} from "../services/changesReportService";
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";
import { formatDisplayDate } from "./CadreReportPage";
import {
    getApiErrorMessage,
    getPrimaryDepartmentName,
    getReportHeaderSubtitle,
} from "../constants/hrms";

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
    fontSize: "0.7rem",
    bgcolor: "grey.200",
    backgroundClip: "padding-box",
    border: "0.5px solid #94A3B8",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    textAlign: "center"
};

const cellSx = {
    fontSize: "0.75rem",
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

function ChangesReportTable({ rows }) {
    return (
        <Table stickyHeader size="small">
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
                {rows.length ? (
                    rows.map((row) => (
                        <TableRow
                            key={`${row.serialNo}-${row.nic}-${row.actionDate}`}
                            sx={{ "& td": cellSx }}
                        >
                            {COLUMNS.map((col) => (
                                <TableCell
                                    key={col.key}
                                    align={col.align}
                                >
                                    {col.key === "actionDate"
                                        ? formatDisplayDate(row.actionDate) || "—"
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
                            sx={{ ...cellSx, py: 4 }}
                        >
                            No changes recorded for this period.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

export default function ChangesReportPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [fullScreenOpen, setFullScreenOpen] = useState(false);

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

    const reportRows = report?.rows || [];

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

    const handlePrint = async () => {
        setPrinting(true);
        try {
            const blob = await downloadChangesReportPdf(year, month);
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
        <Container maxWidth={false} className="changes-report-page" sx={{ pb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Changes Report
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
                        useFlexGap
                        sx={{ flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}
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
                            Changes Report — {getPrimaryDepartmentName()}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Period: {periodLabel}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Total Changes: {report.totalCount ?? reportRows.length}
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
                        tableMinWidth={1000}
                        sx={{
                            maxHeight: "70vh",
                            overflow: "auto",
                            border: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <ChangesReportTable rows={reportRows} />
                    </ResponsiveTableContainer>
                </Paper>
            )}

            {!report && !loading && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        Select a year and month, then click Generate Report.
                    </Typography>
                </Paper>
            )}

            <Dialog
                fullScreen
                open={fullScreenOpen}
                onClose={() => setFullScreenOpen(false)}
                aria-labelledby="changes-full-screen-title"
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
                                id="changes-full-screen-title"
                                variant="h6"
                                noWrap
                                sx={{ fontWeight: 750, lineHeight: 1.25 }}
                            >
                                Changes Report
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ display: "block" }}
                            >
                                {getPrimaryDepartmentName()} · {periodLabel}
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
                        tableMinWidth={1000}
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
                        <ChangesReportTable rows={reportRows} />
                    </ResponsiveTableContainer>
                </DialogContent>
            </Dialog>
        </Container>
    );
}
