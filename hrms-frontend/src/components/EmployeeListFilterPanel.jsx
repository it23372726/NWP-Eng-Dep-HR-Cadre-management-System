import {
    Box,
    Paper,
    TextField,
    MenuItem,
    Stack,
    Typography,
    IconButton,
    InputAdornment,
    Chip,
    Button
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import {
    PERMANENT_STATUS_OPTIONS,
    GRADE_PROMOTION_FILTER_OPTIONS,
    RETIREMENT_FILTER_OPTIONS,
    DISTRICT_FILTER_OPTIONS,
    QUALIFICATION_FILTER_OPTIONS
} from "../constants/hrms";
import { getActiveFilterLabels } from "../utils/employeeListFilters";

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
    resultSummary
}) {
    const activeFilterLabels = getActiveFilterLabels(filterState);

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: "background.paper"
            }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Search & Filters
            </Typography>

            <TextField
                label="Search employees"
                placeholder="Name, S/N, NIC, designation, service level, contact..."
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

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1.5
                }}
            >
                <TextField
                    label="Permanent status"
                    select
                    size="small"
                    value={filterState.permanentStatusFilter}
                    onChange={(e) => onFilterChange({
                        permanentStatusFilter: e.target.value
                    })}
                    sx={filterFieldSx}
                >
                    {PERMANENT_STATUS_OPTIONS.map((option) => (
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
                    {DISTRICT_FILTER_OPTIONS.map((option) => (
                        <MenuItem key={option.value || "ALL"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

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
            </Box>

            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2 }}
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
        </Paper>
    );
}
