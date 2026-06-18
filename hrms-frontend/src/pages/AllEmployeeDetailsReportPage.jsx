import {
    Autocomplete,
    Box,
    Button,
    Chip,
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
    CircularProgress,
    IconButton,
    InputAdornment
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
    getAllEmployeeDetailsReport,
    downloadAllEmployeeDetailsReportExcel,
    downloadAllEmployeeDetailsReportPdf,
    triggerDownload
} from "../services/allEmployeeDetailsReportService";
import { getDesignations } from "../services/designationService";
import { getApiErrorMessage } from "../constants/hrms";
import { formatMonthDayDisplay } from "../utils/monthDayDate";

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
    { key: "employmentType", label: "Employment Type", align: "center", width: 130 },
    { key: "permanentStatus", label: "Permanent Status", align: "center", width: 140 },
    { key: "qualifiedForPermanent", label: "Qualified For Permanent", align: "center", width: 150 },
    { key: "permanentQualificationDate", label: "Qualification Date", align: "center", width: 120 },
    { key: "permanentConfirmationDate", label: "Permanent Confirmation Date", align: "center", width: 140 },
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
    border: "1px solid",
    borderColor: "divider",
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

const matchesSearchTerm = (row, searchTerm) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();

    return (
        (row.serialNo && row.serialNo.toString().includes(term)) ||
        (row.employeeName && row.employeeName.toLowerCase().includes(term)) ||
        (row.nic && row.nic.toLowerCase().includes(term)) ||
        (row.serviceCategory && row.serviceCategory.toLowerCase().includes(term)) ||
        (row.service && row.service.toLowerCase().includes(term)) ||
        (row.contactNo && row.contactNo.toLowerCase().includes(term)) ||
        (row.currentWorkingPlace && row.currentWorkingPlace.toLowerCase().includes(term)) ||
        (row.currentDistrictOfWorking && row.currentDistrictOfWorking.toLowerCase().includes(term))
    );
};

const matchesDesignationFilter = (row, selectedDesignations) => {
    if (selectedDesignations.length === 0) return true;

    const rowDesignation = (row.designation || "").toLowerCase();
    return selectedDesignations.some(
        (designation) => designation.designationName.toLowerCase() === rowDesignation
    );
};

export default function AllEmployeeDetailsReportPage() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [designations, setDesignations] = useState([]);
    const [selectedDesignations, setSelectedDesignations] = useState([]);

    useEffect(() => {
        loadReport();
        loadDesignations();
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

    const loadDesignations = async () => {
        try {
            const data = await getDesignations();
            const sorted = [...data].sort((a, b) =>
                (a.designationName || "").localeCompare(b.designationName || "")
            );
            setDesignations(sorted);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const hasActiveFilters =
        Boolean(searchTerm.trim()) || selectedDesignations.length > 0;

    const filteredRows = useMemo(() => {
        if (!report?.rows) return [];

        return report.rows.filter(
            (row) =>
                matchesSearchTerm(row, searchTerm.trim()) &&
                matchesDesignationFilter(row, selectedDesignations)
        );
    }, [report, searchTerm, selectedDesignations]);

    const handleClearFilters = () => {
        setSearchTerm("");
        setSelectedDesignations([]);
    };

    const handleExportExcel = async () => {
        try {
            const blob = await downloadAllEmployeeDetailsReportExcel();
            triggerDownload(blob, "all-employee-details-report.xlsx");
            toast.success("Excel downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleExportPdf = async () => {
        try {
            const blob = await downloadAllEmployeeDetailsReportPdf();
            triggerDownload(blob, "all-employee-details-report.pdf");
            toast.success("PDF downloaded");
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    return (
        <Container maxWidth={false} sx={{ pb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    All Employee Details Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    North Western Provincial Council — Engineering Department
                </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={2}
                    sx={{
                        alignItems: { xs: "stretch", lg: "center" },
                        flexWrap: "wrap",
                        gap: 1
                    }}
                >
                    <TextField
                        label="Search Employees"
                        placeholder="Name, S/N, NIC, service, district, contact..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flex: "1 1 240px", minWidth: 220 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "text.secondary" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm ? (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setSearchTerm("")}
                                            edge="end"
                                            aria-label="Clear search"
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null
                            }
                        }}
                    />

                    <Autocomplete
                        multiple
                        disableCloseOnSelect
                        limitTags={2}
                        options={designations}
                        value={selectedDesignations}
                        onChange={(_, newValue) => setSelectedDesignations(newValue)}
                        getOptionLabel={(option) => option.designationName || ""}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        sx={{ flex: "1 1 280px", minWidth: 240 }}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return (
                                    <Chip
                                        key={key}
                                        label={option.designationName}
                                        size="small"
                                        {...tagProps}
                                    />
                                );
                            })
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Filter by Designation"
                                placeholder={
                                    selectedDesignations.length === 0
                                        ? "Select designations"
                                        : ""
                                }
                                size="small"
                            />
                        )}
                    />

                    {hasActiveFilters && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={handleClearFilters}
                            startIcon={<ClearIcon fontSize="small" />}
                            sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", lg: "center" } }}
                        >
                            Clear filters
                        </Button>
                    )}

                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ flexShrink: 0, ml: { lg: "auto" } }}
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
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ mb: 2 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} sx={{ mb: 2, justifyContent: "space-between" }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Total Employees: {report.totalCount}
                                </Typography>
                                <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                                    Showing {filteredRows.length}
                                    {hasActiveFilters ? ` of ${report.totalCount}` : ""} employees
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Generated: {new Date(report.generatedAt).toLocaleString()}
                            </Typography>
                        </Stack>
                    </Box>

                    {filteredRows.length === 0 && hasActiveFilters ? (
                        <Box sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary" gutterBottom>
                                No employees found
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Try adjusting the search term or designation filters
                            </Typography>
                        </Box>
                    ) : (
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
                                                align={col.align || "center"}
                                                sx={headerCellSx}
                                            >
                                                {col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredRows.map((row, index) => (
                                        <TableRow
                                            key={row.serialNo || index}
                                            sx={{
                                                "& td": cellSx
                                            }}
                                        >
                                            {COLUMNS.map((col) => (
                                                <TableCell
                                                    key={col.key}
                                                    align={col.align || "center"}
                                                >
                                                {col.key === "incremantDate"
                                                    ? formatMonthDayDisplay(row[col.key])
                                                    : col.key.includes("date") || col.key.includes("Date")
                                                    ? formatDate(row[col.key])
                                                    : row[col.key] ?? "—"}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
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
        </Container>
    );
}
