import {
    Box,
    Collapse,
    IconButton,
    Paper,
    TextField,
    MenuItem,
    Stack,
    Typography,
    InputAdornment,
    Chip,
    Button
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
    EMPLOYEE_TYPE_FILTER_OPTIONS,
    GRADE_PROMOTION_FILTER_OPTIONS,
    RETIREMENT_FILTER_OPTIONS,
    QUALIFICATION_FILTER_OPTIONS
} from "../constants/hrms";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { PRIVATE_VEHICLE_FILTER_OPTIONS } from "../utils/privateVehicle";
import { getActiveFilterLabels } from "../utils/employeeListFilters";
import { getDistrictFilterOptions } from "../utils/organizationSettingsStore";

const filterFieldSx = {
    minWidth: { xs: "100%", sm: 220 },
    flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)", md: "1 1 calc(33.333% - 16px)" }
};

export default function EmployeeListFilterPanel({
    filterState,
    onFilterChange,
    onClearFilters,
    onClearFilterKey,
    filtersActive,
    resultSummary,
    expanded = true,
    onToggleExpanded,
    showDistrictFilter = true,
    compact = false
}) {
    useOrganizationSettings();
    const districtFilterOptions = getDistrictFilterOptions();
    const activeFilterLabels = getActiveFilterLabels(filterState);

    return (
        <Paper
            variant="outlined"
            sx={{
                mb: 2,
                borderRadius: 2,
                bgcolor: "background.paper",
                overflow: "hidden"
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                sx={{
                    px: 2.5,
                    py: 1.5,
                    gap: 1.5,
                    bgcolor: filtersActive ? "primary.50" : "grey.50",
                    borderBottom: expanded ? "1px solid" : "none",
                    borderColor: "divider"
                }}
            >
                <FilterListIcon
                    sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                        Search & Filters
                    </Typography>
                    {!expanded && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {resultSummary}
                        </Typography>
                    )}
                </Box>
                {filtersActive && (
                    <Chip
                        label={`${activeFilterLabels.length} active`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ flexShrink: 0, display: { xs: "none", sm: "inline-flex" } }}
                    />
                )}
                {onToggleExpanded && (
                    <IconButton
                        size="small"
                        onClick={onToggleExpanded}
                        aria-label={expanded ? "Collapse filters" : "Expand filters"}
                        sx={{ flexShrink: 0, ml: "auto" }}
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                )}
            </Stack>

            <Collapse in={expanded}>
                <Box sx={{ p: 2.5 }}>
            <TextField
                label="Search employees"
                placeholder="Name, S/N, NIC, designation, service code, service level, contact..."
                value={filterState.searchTerm}
                onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "text.secondary" }} />
                            </InputAdornment>
                        ),
                        endAdornment: filterState.searchTerm ? (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => onFilterChange({ searchTerm: "" })}
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

            {!compact && (
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1.5
                }}
            >
                <TextField
                    label="Employee type"
                    select
                    size="small"
                    value={filterState.permanentStatusFilter}
                    onChange={(e) => onFilterChange({
                        permanentStatusFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {EMPLOYEE_TYPE_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Grade promotion"
                    select
                    size="small"
                    value={filterState.gradePromotionFilter}
                    onChange={(e) => onFilterChange({
                        gradePromotionFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {GRADE_PROMOTION_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Retirement"
                    select
                    size="small"
                    value={filterState.retiringWithinMonths}
                    onChange={(e) => onFilterChange({
                        retiringWithinMonths: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {RETIREMENT_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value || "ALL"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                {showDistrictFilter && (
                <TextField
                    label="District"
                    select
                    size="small"
                    value={filterState.districtFilter}
                    onChange={(e) => onFilterChange({
                        districtFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {districtFilterOptions.map((option) => (
                        <MenuItem key={option.value || "ALL"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
                )}

                <TextField
                    label="Qualification"
                    select
                    size="small"
                    value={filterState.qualificationFilter}
                    onChange={(e) => onFilterChange({
                        qualificationFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {QUALIFICATION_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value || "ALL"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Private vehicle"
                    select
                    size="small"
                    value={filterState.privateVehicleFilter}
                    onChange={(e) => onFilterChange({
                        privateVehicleFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {PRIVATE_VEHICLE_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value || "ALL"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>
            )}

            <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ mt: 2, alignItems: "center", flexWrap: "wrap" }}
            >
                <Typography variant="body2" color="text.secondary">
                    {resultSummary}
                </Typography>
                {filtersActive && (
                    <>
                        {activeFilterLabels.map((filter) => (
                            <Chip
                                key={filter.key}
                                label={filter.label}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onDelete={() => onClearFilterKey(filter.key)}
                            />
                        ))}
                        <Button
                            size="small"
                            startIcon={<FilterListOffIcon />}
                            onClick={onClearFilters}
                        >
                            Clear all
                        </Button>
                    </>
                )}
            </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
