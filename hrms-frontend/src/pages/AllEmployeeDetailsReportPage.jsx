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
    getAllEmployeeDetailsReport,
    downloadAllEmployeeDetailsReportExcel,
    downloadAllEmployeeDetailsReportPdf,
    printPdfBlob,
    triggerDownload
} from "../services/allEmployeeDetailsReportService";
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";
import EmployeeListFilterPanel, {
    REPORT_FILTER_SECTIONS
} from "../components/EmployeeListFilterPanel";
import { getApiErrorMessage, getReportHeaderSubtitle } from "../constants/hrms";
import { formatMonthDayDisplay } from "../utils/monthDayDate";
import {
    buildAllEmployeeDetailsReportTitle,
    deriveReportFilterOptions,
    EMPTY_EMPLOYEE_FILTER_STATE,
    filterAllEmployeeDetailsReportRows,
    getActiveReportFilterLabels,
    hasActiveReportFilters
} from "../utils/employeeListFilters";

const COLUMNS = [
    { key: "serialNo", label: "S/N", align: "center", width: 60 },
    { key: "employeeName", label: "Name of the Employee", align: "left", width: 200 },
    { key: "designation", label: "Designation", align: "left", width: 180 },
    { key: "nic", label: "NIC No", align: "center", width: 120 },
    { key: "dateOfBirth", label: "Date of Birth", align: "center", width: 120 },
    { key: "gender", label: "Gender", align: "center", width: 80 },
    { key: "serviceCategory", label: "Service Category", align: "center", width: 120 },
    { key: "service", label: "Service", align: "center", width: 120 },
    { key: "salaryCode", label: "Salary Code", align: "center", width: 100 },
    { key: "grade", label: "Grade", align: "center", width: 100 },
    { key: "natureOfAppointment", label: "Nature of Appointment", align: "center", width: 150 },
    { key: "dateOfFirstAppointment", label: "Date of First Appointment", align: "center", width: 120 },
    { key: "incremantDate", label: "Increment Date", align: "center", width: 120 },
    { key: "enteredDateToAllIslandService", label: "Entered Date to All Island Service", align: "center", width: 120 },
    { key: "reportedDateToPresentWorkingPlace", label: "Reported Date to Present Working Place", align: "center", width: 120 },
    { key: "currentWorkingPlace", label: "Current Working Place", align: "left", width: 180 },
    { key: "currentDistrictOfWorking", label: "Current District of Working", align: "center", width: 120 },
    { key: "appointmentDateToPresentClassGrade", label: "Appointment Date to Present Class/Grade", align: "center", width: 120 },
    { key: "enteredDateToNWPCouncil", label: "Entered Date to the N.W.P. Council", align: "center", width: 120 },
    { key: "permanentAddress", label: "Permanent Address", align: "left", width: 200 },
    { key: "residentDistrict", label: "Resident District", align: "center", width: 120 },
    { key: "contactNo", label: "Contact No", align: "center", width: 120 }
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

const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB");
};

function EmployeeDetailsTable({ rows }) {
    return (
        <Table stickyHeader size="small">
            <TableHead>
                <TableRow>
                    {COLUMNS.map((col) => (
                        <TableCell
                            key={col.key}
                            align={col.align || "center"}
                            sx={headerCellSx}
                        >
                            {col.label}
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((row, index) => (
                    <TableRow
                        key={row.serialNo || index}
                        sx={{ "& td": cellSx }}
                    >
                        {COLUMNS.map((col) => (
                            <TableCell
                                key={col.key}
                                align={col.align || "center"}
                            >
                                {col.key === "incremantDate"
                                    ? formatMonthDayDisplay(row[col.key])
                                    : col.key.includes("date")
                                            || col.key.includes("Date")
                                    ? formatDate(row[col.key])
                                    : row[col.key] ?? "—"}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function AllEmployeeDetailsReportPage() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [fullScreenOpen, setFullScreenOpen] = useState(false);
    const [filterState, setFilterState] = useState(EMPTY_EMPLOYEE_FILTER_STATE);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await getAllEmployeeDetailsReport();
            setReport(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const reportRows = useMemo(() => report?.rows || [], [report]);

    const filterOptions = useMemo(
        () => deriveReportFilterOptions(reportRows, {
            districtFilter: filterState.districtFilter
        }),
        [reportRows, filterState.districtFilter]
    );

    const filtersActive = hasActiveReportFilters(filterState);

    const filteredRows = useMemo(
        () => filterAllEmployeeDetailsReportRows(reportRows, filterState),
        [reportRows, filterState]
    );

    const resultSummary = loading
        ? "Loading employees..."
        : report
            ? `Showing ${filteredRows.length} of ${report.totalCount} employee${report.totalCount !== 1 ? "s" : ""}`
            : "Load the report to filter employees";

    const handleFilterChange = (updates) => {
        setFilterState((prev) => {
            const next = { ...prev, ...updates };

            if (Object.prototype.hasOwnProperty.call(updates, "districtFilter")
                && updates.districtFilter !== prev.districtFilter
                && !Object.prototype.hasOwnProperty.call(updates, "officeFilter")) {
                const offices = deriveReportFilterOptions(reportRows, {
                    districtFilter: updates.districtFilter || ""
                }).officeOptions.map((option) => option.value.toLowerCase());
                const currentOffice = (next.officeFilter || "").toLowerCase();
                if (currentOffice && !offices.includes(currentOffice)) {
                    next.officeFilter = "";
                }
            }

            return next;
        });
    };

    const handleClearFilters = () => {
        setFilterState({ ...EMPTY_EMPLOYEE_FILTER_STATE });
    };

    const handleClearFilterKey = (key) => {
        const updates = {
            employmentType: { employmentTypeFilter: "" },
            retiringWithin: { retiringWithinMonths: "" },
            district: { districtFilter: "", officeFilter: "" },
            office: { officeFilter: "" },
            designation: { designationFilter: "" },
            service: { serviceFilter: "" },
            serviceLevel: { serviceLevelFilter: "" },
            grade: { gradeFilter: "" },
            search: { searchTerm: "" }
        }[key];

        if (updates) {
            handleFilterChange(updates);
        }
    };

    const buildExportPayload = () => ({
        generatedAt: report.generatedAt,
        totalCount: filteredRows.length,
        reportTitle: buildAllEmployeeDetailsReportTitle(filterState),
        rows: filteredRows
    });

    const handleExportExcel = async () => {
        if (!report) {
            return;
        }
        if (filteredRows.length === 0) {
            toast.error("No employees to export");
            return;
        }
        try {
            const blob = await downloadAllEmployeeDetailsReportExcel(
                buildExportPayload()
            );
            triggerDownload(blob, "all-employee-details-report.xlsx");
            toast.success(
                filtersActive
                    ? `Excel downloaded (${filteredRows.length} employees)`
                    : "Excel downloaded"
            );
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleExportPdf = async () => {
        if (!report) {
            return;
        }
        if (filteredRows.length === 0) {
            toast.error("No employees to export");
            return;
        }
        try {
            const blob = await downloadAllEmployeeDetailsReportPdf(
                buildExportPayload()
            );
            triggerDownload(blob, "all-employee-details-report.pdf");
            toast.success(
                filtersActive
                    ? `PDF downloaded (${filteredRows.length} employees)`
                    : "PDF downloaded"
            );
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handlePrint = async () => {
        if (!report) {
            return;
        }
        if (filteredRows.length === 0) {
            toast.error("No employees to print");
            return;
        }
        setPrinting(true);
        try {
            const blob = await downloadAllEmployeeDetailsReportPdf(
                buildExportPayload()
            );
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
        <Container maxWidth={false} sx={{ pb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    All Employee Details Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {getReportHeaderSubtitle()}
                </Typography>
            </Box>

            <EmployeeListFilterPanel
                filterState={filterState}
                filterOptions={filterOptions}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onClearFilterKey={handleClearFilterKey}
                filtersActive={filtersActive}
                resultSummary={resultSummary}
                sections={REPORT_FILTER_SECTIONS}
                resolveActiveFilterLabels={getActiveReportFilterLabels}
                toolbarActions={(
                    <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ flexWrap: "wrap" }}
                    >
                        <Button
                            variant="contained"
                            onClick={loadReport}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Refresh"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportExcel}
                            disabled={!report || loading || printing || filteredRows.length === 0}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportPdf}
                            disabled={!report || loading || printing || filteredRows.length === 0}
                        >
                            Export PDF
                        </Button>
                        <Button
                            variant="text"
                            onClick={handlePrint}
                            disabled={!report || loading || printing || filteredRows.length === 0}
                        >
                            {printing ? "Preparing print…" : "Print"}
                        </Button>
                    </Stack>
                )}
            />

            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {report && !loading && (
                <Paper sx={{ p: 2 }}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{
                            mb: 2,
                            alignItems: { xs: "stretch", sm: "center" },
                            justifyContent: "space-between"
                        }}
                    >
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Total Employees: {report.totalCount}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="primary"
                                sx={{ fontWeight: 500 }}
                            >
                                Showing {filteredRows.length}
                                {filtersActive ? ` of ${report.totalCount}` : ""}{" "}
                                employees
                            </Typography>
                        </Box>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Generated: {new Date(report.generatedAt).toLocaleString()}
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FullscreenRoundedIcon />}
                                onClick={() => setFullScreenOpen(true)}
                            >
                                Full screen
                            </Button>
                        </Stack>
                    </Stack>

                    {filteredRows.length === 0 && filtersActive ? (
                        <Box sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary" gutterBottom>
                                No employees found
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Try adjusting the search term or filters
                            </Typography>
                        </Box>
                    ) : (
                        <ResponsiveTableContainer
                            tableMinWidth={2600}
                            sx={{
                                maxHeight: "70vh",
                                border: "1px solid",
                                borderColor: "divider"
                            }}
                        >
                            <EmployeeDetailsTable rows={filteredRows} />
                        </ResponsiveTableContainer>
                    )}
                </Paper>
            )}

            {!report && !loading && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        Click Refresh to load the report.
                    </Typography>
                </Paper>
            )}

            <Dialog
                fullScreen
                open={fullScreenOpen}
                onClose={() => setFullScreenOpen(false)}
                aria-labelledby="all-employees-full-screen-title"
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
                                id="all-employees-full-screen-title"
                                variant="h6"
                                noWrap
                                sx={{ fontWeight: 750, lineHeight: 1.25 }}
                            >
                                All Employee Details Report
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ display: "block" }}
                            >
                                Showing {filteredRows.length}
                                {filtersActive ? ` of ${report?.totalCount ?? 0}` : ""}{" "}
                                employees
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PrintRoundedIcon />}
                            onClick={handlePrint}
                            disabled={printing || filteredRows.length === 0}
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
                    {filteredRows.length === 0 ? (
                        <Box
                            sx={{
                                flex: 1,
                                display: "grid",
                                placeItems: "center",
                                textAlign: "center"
                            }}
                        >
                            <Box>
                                <Typography color="text.secondary" gutterBottom>
                                    No employees found
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Adjust the report filters and try again.
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <ResponsiveTableContainer
                            showScrollHint={false}
                            tableMinWidth={2600}
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
                            <EmployeeDetailsTable rows={filteredRows} />
                        </ResponsiveTableContainer>
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    );
}
