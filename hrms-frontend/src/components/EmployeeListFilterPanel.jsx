import { useMemo, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import {
    EMPLOYMENT_TYPES,
    EMPLOYEE_TYPE_FILTER_OPTIONS,
    GRADE_PROMOTION_FILTER_OPTIONS,
    PERMANENT_TRACK_FILTER_VALUES,
    QUALIFICATION_FILTER_OPTIONS,
    RETIREMENT_FILTER_OPTIONS
} from "../constants/hrms";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { PRIVATE_VEHICLE_FILTER_OPTIONS } from "../utils/privateVehicle";
import {
    getActiveFilterLabels,
    INCREMENT_STATUS_FILTER_OPTIONS
} from "../utils/employeeListFilters";
import { getDistrictFilterOptions } from "../utils/organizationSettingsStore";

const ALL_OPTION = { value: "", label: "All" };
const ALL_STATUS_OPTION = { value: "ALL", label: "All" };

const PERMANENT_STATUS_FILTER_OPTIONS = [
    ALL_STATUS_OPTION,
    ...EMPLOYEE_TYPE_FILTER_OPTIONS.filter((option) =>
        PERMANENT_TRACK_FILTER_VALUES.includes(option.value)
    )
];

const EMPLOYMENT_TYPE_FILTER_OPTIONS = [
    ALL_OPTION,
    ...EMPLOYMENT_TYPES
];

const DEFAULT_SECTIONS = {
    placement: true,
    employmentType: true,
    permanentStatus: true,
    gradePromotion: true,
    retirement: true,
    qualification: true,
    incrementStatus: true,
    privateVehicle: true
};

export const REPORT_FILTER_SECTIONS = {
    placement: true,
    employmentType: true,
    permanentStatus: false,
    gradePromotion: false,
    retirement: true,
    qualification: false,
    incrementStatus: false,
    privateVehicle: false
};

function FilterSelect({
    label,
    value,
    onChange,
    options,
    disabled = false
}) {
    return (
        <TextField
            label={label}
            select
            size="small"
            fullWidth
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        >
            {options.map((option) => (
                <MenuItem
                    key={option.value || `${label}-all`}
                    value={option.value}
                >
                    {option.label}
                </MenuItem>
            ))}
        </TextField>
    );
}

function FilterSection({ title, children }) {
    return (
        <Box>
            <Typography
                variant="overline"
                sx={{
                    display: "block",
                    mb: 1.25,
                    color: "text.secondary",
                    fontWeight: 700,
                    letterSpacing: 0.8
                }}
            >
                {title}
            </Typography>
            <Stack spacing={1.75}>
                {children}
            </Stack>
        </Box>
    );
}

export default function EmployeeListFilterPanel({
    filterState,
    filterOptions = {},
    onFilterChange,
    onClearFilters,
    onClearFilterKey,
    filtersActive,
    resultSummary,
    showPlacementFilters = true,
    sections = DEFAULT_SECTIONS,
    resolveActiveFilterLabels = getActiveFilterLabels,
    toolbarActions = null
}) {
    useOrganizationSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [drawerOpen, setDrawerOpen] = useState(false);

    const districtFilterOptions = getDistrictFilterOptions();
    const sectionConfig = { ...DEFAULT_SECTIONS, ...sections };
    const showPlacement = showPlacementFilters && sectionConfig.placement;
    const activeFilterLabels = resolveActiveFilterLabels(filterState);
    const activeFilterCount = activeFilterLabels.length;

    const showEmploymentCareer = sectionConfig.employmentType
        || sectionConfig.permanentStatus
        || sectionConfig.gradePromotion
        || sectionConfig.retirement;
    const showPlanningCompliance = sectionConfig.qualification
        || sectionConfig.incrementStatus
        || sectionConfig.privateVehicle;

    const {
        designationOptions = [],
        serviceOptions = [],
        serviceLevelOptions = [],
        gradeOptions = [],
        officeOptions = []
    } = filterOptions;

    const permanentStatusOptions = useMemo(() => {
        const current = filterState.permanentStatusFilter;
        if (!current || current === "ALL"
            || PERMANENT_TRACK_FILTER_VALUES.includes(current)) {
            return PERMANENT_STATUS_FILTER_OPTIONS;
        }

        const legacy = EMPLOYEE_TYPE_FILTER_OPTIONS.find(
            (option) => option.value === current
        );
        if (!legacy) {
            return PERMANENT_STATUS_FILTER_OPTIONS;
        }

        return [...PERMANENT_STATUS_FILTER_OPTIONS, legacy];
    }, [filterState.permanentStatusFilter]);

    const withAll = (options) => [ALL_OPTION, ...options];

    return (
        <>
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
                    spacing={1.5}
                    sx={{
                        px: { xs: 1.5, sm: 2 },
                        py: 1.5
                    }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        sx={{ alignItems: { md: "center" } }}
                    >
                        <TextField
                            label="Search employees"
                            placeholder="Name, S/N, NIC, designation, service..."
                            value={filterState.searchTerm}
                            onChange={(event) => onFilterChange({
                                searchTerm: event.target.value
                            })}
                            size="small"
                            fullWidth
                            sx={{ flex: 1, minWidth: 0 }}
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
                                                onClick={() => onFilterChange({
                                                    searchTerm: ""
                                                })}
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

                        <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{
                                alignItems: "center",
                                flexWrap: "wrap",
                                flexShrink: 0
                            }}
                        >
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: "nowrap" }}
                            >
                                {resultSummary}
                            </Typography>

                            <Badge
                                color="primary"
                                badgeContent={activeFilterCount}
                                invisible={activeFilterCount === 0}
                                overlap="circular"
                            >
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterListIcon />}
                                    onClick={() => setDrawerOpen(true)}
                                >
                                    Filters
                                </Button>
                            </Badge>

                            {filtersActive && (
                                <Button
                                    size="small"
                                    startIcon={<FilterListOffIcon />}
                                    onClick={onClearFilters}
                                >
                                    Clear all
                                </Button>
                            )}

                            {toolbarActions}
                        </Stack>
                    </Stack>

                    {filtersActive && (
                        <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{ alignItems: "center", flexWrap: "wrap" }}
                        >
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
                        </Stack>
                    )}
                </Stack>
            </Paper>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : 400,
                        maxWidth: "100%"
                    }
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                            px: 2.5,
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <FilterListIcon color="primary" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Filters
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {resultSummary}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Close filters"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <Box
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            px: 2.5,
                            py: 2.5
                        }}
                    >
                        <Stack spacing={3} divider={<Divider flexItem />}>
                            {showPlacement && (
                                <FilterSection title="Placement & Role">
                                    <FilterSelect
                                        label="District"
                                        value={filterState.districtFilter}
                                        onChange={(value) => onFilterChange({
                                            districtFilter: value
                                        })}
                                        options={districtFilterOptions}
                                    />
                                    <FilterSelect
                                        label="Office"
                                        value={filterState.officeFilter}
                                        onChange={(value) => onFilterChange({
                                            officeFilter: value
                                        })}
                                        options={withAll(officeOptions)}
                                    />
                                    <FilterSelect
                                        label="Designation"
                                        value={filterState.designationFilter}
                                        onChange={(value) => onFilterChange({
                                            designationFilter: value
                                        })}
                                        options={withAll(designationOptions)}
                                    />
                                    <FilterSelect
                                        label="Service"
                                        value={filterState.serviceFilter}
                                        onChange={(value) => onFilterChange({
                                            serviceFilter: value
                                        })}
                                        options={withAll(serviceOptions)}
                                    />
                                    <FilterSelect
                                        label="Service level"
                                        value={filterState.serviceLevelFilter}
                                        onChange={(value) => onFilterChange({
                                            serviceLevelFilter: value
                                        })}
                                        options={withAll(serviceLevelOptions)}
                                    />
                                    <FilterSelect
                                        label="Grade"
                                        value={filterState.gradeFilter}
                                        onChange={(value) => onFilterChange({
                                            gradeFilter: value
                                        })}
                                        options={withAll(gradeOptions)}
                                    />
                                </FilterSection>
                            )}

                            {!showPlacement && (
                                <FilterSection title="Role">
                                    <FilterSelect
                                        label="Designation"
                                        value={filterState.designationFilter}
                                        onChange={(value) => onFilterChange({
                                            designationFilter: value
                                        })}
                                        options={withAll(designationOptions)}
                                    />
                                    <FilterSelect
                                        label="Service"
                                        value={filterState.serviceFilter}
                                        onChange={(value) => onFilterChange({
                                            serviceFilter: value
                                        })}
                                        options={withAll(serviceOptions)}
                                    />
                                    <FilterSelect
                                        label="Service level"
                                        value={filterState.serviceLevelFilter}
                                        onChange={(value) => onFilterChange({
                                            serviceLevelFilter: value
                                        })}
                                        options={withAll(serviceLevelOptions)}
                                    />
                                    <FilterSelect
                                        label="Grade"
                                        value={filterState.gradeFilter}
                                        onChange={(value) => onFilterChange({
                                            gradeFilter: value
                                        })}
                                        options={withAll(gradeOptions)}
                                    />
                                </FilterSection>
                            )}

                            {showEmploymentCareer && (
                                <FilterSection title="Employment & Career">
                                    {sectionConfig.employmentType && (
                                        <FilterSelect
                                            label="Employment type"
                                            value={filterState.employmentTypeFilter}
                                            onChange={(value) => onFilterChange({
                                                employmentTypeFilter: value
                                            })}
                                            options={EMPLOYMENT_TYPE_FILTER_OPTIONS}
                                        />
                                    )}
                                    {sectionConfig.permanentStatus && (
                                        <FilterSelect
                                            label="Permanent status"
                                            value={filterState.permanentStatusFilter}
                                            onChange={(value) => onFilterChange({
                                                permanentStatusFilter: value
                                            })}
                                            options={permanentStatusOptions}
                                        />
                                    )}
                                    {sectionConfig.gradePromotion && (
                                        <FilterSelect
                                            label="Grade promotion"
                                            value={filterState.gradePromotionFilter}
                                            onChange={(value) => onFilterChange({
                                                gradePromotionFilter: value
                                            })}
                                            options={GRADE_PROMOTION_FILTER_OPTIONS}
                                        />
                                    )}
                                    {sectionConfig.retirement && (
                                        <FilterSelect
                                            label="Retirement"
                                            value={filterState.retiringWithinMonths}
                                            onChange={(value) => onFilterChange({
                                                retiringWithinMonths: value
                                            })}
                                            options={RETIREMENT_FILTER_OPTIONS}
                                        />
                                    )}
                                </FilterSection>
                            )}

                            {showPlanningCompliance && (
                                <FilterSection title="Planning & Compliance">
                                    {sectionConfig.qualification && (
                                        <FilterSelect
                                            label="Qualification"
                                            value={filterState.qualificationFilter}
                                            onChange={(value) => onFilterChange({
                                                qualificationFilter: value
                                            })}
                                            options={QUALIFICATION_FILTER_OPTIONS}
                                        />
                                    )}
                                    {sectionConfig.incrementStatus && (
                                        <FilterSelect
                                            label="Salary increment"
                                            value={filterState.incrementStatusFilter}
                                            onChange={(value) => onFilterChange({
                                                incrementStatusFilter: value
                                            })}
                                            options={INCREMENT_STATUS_FILTER_OPTIONS}
                                        />
                                    )}
                                    {sectionConfig.privateVehicle && (
                                        <FilterSelect
                                            label="Private vehicle"
                                            value={filterState.privateVehicleFilter}
                                            onChange={(value) => onFilterChange({
                                                privateVehicleFilter: value
                                            })}
                                            options={PRIVATE_VEHICLE_FILTER_OPTIONS}
                                        />
                                    )}
                                </FilterSection>
                            )}
                        </Stack>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            px: 2.5,
                            py: 2,
                            borderTop: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<FilterListOffIcon />}
                            onClick={onClearFilters}
                            disabled={!filtersActive}
                        >
                            Clear all
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => setDrawerOpen(false)}
                        >
                            Done
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </>
    );
}
