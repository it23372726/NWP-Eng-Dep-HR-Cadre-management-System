import { useEffect, useMemo, useState } from "react";
import {
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Skeleton,
    Alert,
    Box,
    Stack,
    Chip,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    Button
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { BAR_CHART_PREVIEW_HEIGHT, getDistrictColor } from "../constants/dashboardTheme";
import { buildEmployeeListUrl } from "../utils/dashboardNavigation";
import ExpandableVerticalBarChart from "./ExpandableVerticalBarChart";

function resolveAvailableDistricts(configuredDistricts, districtData, workplaceDistributionByDistrict) {
    const fromWorkplaces = (workplaceDistributionByDistrict || []).map((item) => item.district);
    const fromCounts = (districtData || [])
        .filter((district) => district.district !== "Not assigned")
        .map((district) => district.district);

    return (configuredDistricts || []).filter(
        (district) => fromWorkplaces.includes(district) || fromCounts.includes(district)
    );
}

function DistrictCard({
    district,
    employeeCount,
    percentage,
    color,
    isSelected,
    isClickable,
    onSelect,
    onViewEmployees
}) {
    return (
        <Card
            sx={{
                border: "2px solid",
                borderColor: isSelected ? color : "divider",
                transition: "all 0.3s ease",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                ...(isClickable && {
                    "&:hover": {
                        boxShadow: 2,
                        borderColor: color
                    }
                })
            }}
        >
            <CardContent
                onClick={isClickable ? onSelect : undefined}
                sx={{
                    flex: 1,
                    cursor: isClickable ? "pointer" : "default",
                    pb: "16px !important"
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: `${color}20`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}
                        >
                            <LocationOnIcon sx={{ color, fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {district}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                District assignment
                            </Typography>
                        </Box>
                        {isSelected && (
                            <Chip
                                label="Selected"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor: `${color}14`,
                                    color,
                                    border: `1px solid ${color}44`
                                }}
                            />
                        )}
                    </Stack>

                    <Stack
                        direction="row"


                        spacing={1}
                     sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color, lineHeight: 1 }}>
                                {employeeCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                employees
                            </Typography>
                        </Box>
                        <Chip
                            label={`${percentage}%`}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                bgcolor: `${color}12`,
                                color,
                                border: `1px solid ${color}33`
                            }}
                        />
                    </Stack>

                    <Box>
                        <Stack
                            direction="row"

                            sx={{justifyContent: "space-between",  mb: 0.75 }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Share of staff
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color }}>
                                {percentage}%
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: `${color}12`,
                                overflow: "hidden"
                            }}
                        >
                            <Box
                                sx={{
                                    height: "100%",
                                    width: `${percentage}%`,
                                    borderRadius: 3,
                                    bgcolor: color,
                                    transition: "width 0.3s ease"
                                }}
                            />
                        </Box>
                    </Box>
                </Stack>
            </CardContent>

            {isClickable && (
                <>
                    <Divider />
                    <CardActions sx={{ p: 2, pt: 1.5 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<PeopleIcon />}
                            endIcon={<ArrowForwardIcon />}
                            onClick={(event) => {
                                event.stopPropagation();
                                onViewEmployees();
                            }}
                            sx={{
                                py: 1,
                                fontWeight: 600,
                                textTransform: "none",
                                borderColor: color,
                                color,
                                "&:hover": {
                                    borderColor: color,
                                    bgcolor: `${color}10`
                                }
                            }}
                        >
                            View employees
                        </Button>
                    </CardActions>
                </>
            )}
        </Card>
    );
}

export default function GeographicDistributionPanel({
    districtData,
    workplaceDistributionByDistrict,
    loading
}) {
    const navigate = useNavigate();
    const { districts } = useOrganizationSettings();
    const [selectedDistrict, setSelectedDistrict] = useState("");

    const districtsWithEmployees = (districtData || []).filter(
        (district) => (district.employeeCount ?? 0) > 0
    );
    const availableDistricts = useMemo(
        () => resolveAvailableDistricts(
            districts,
            districtData,
            workplaceDistributionByDistrict
        ),
        [districts, districtData, workplaceDistributionByDistrict]
    );

    useEffect(() => {
        if (availableDistricts.length === 0) {
            setSelectedDistrict("");
            return;
        }

        if (!availableDistricts.includes(selectedDistrict)) {
            setSelectedDistrict(availableDistricts[0]);
        }
    }, [availableDistricts, selectedDistrict]);

    const selectedWorkplaces = (workplaceDistributionByDistrict || []).find(
        (item) => item.district === selectedDistrict
    )?.workplaces ?? [];

    const workplaceChartData = selectedWorkplaces.map((item) => ({
        name: item.category,
        count: item.count
    }));

    const hasDistricts = districtsWithEmployees.length > 0;
    const hasWorkplaces = workplaceChartData.length > 0;
    const totalDistrictEmployees = districtsWithEmployees.reduce(
        (sum, district) => sum + (district.employeeCount ?? 0),
        0
    );

    const handleWorkplaceClick = (entry) => {
        if (!entry?.name || entry.name === "Not specified" || !selectedDistrict) {
            return;
        }

        navigate(buildEmployeeListUrl({
            district: selectedDistrict,
            office: entry.name
        }));
    };

    const handleDistrictSelect = (district) => {
        if (district) {
            setSelectedDistrict(district);
        }
    };

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[1, 2].map((i) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={i}>
                            <Skeleton variant="rectangular" height={80} />
                        </Grid>
                    ))}
                </Grid>
                <Skeleton variant="rectangular" height={BAR_CHART_PREVIEW_HEIGHT} sx={{ mt: 2 }} />
            </Paper>
        );
    }

    if (!hasDistricts && availableDistricts.length === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    District & Workplace Distribution
                </Typography>
                <Alert severity="info">No geographic data available</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                District & Workplace Distribution
            </Typography>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        By District
                    </Typography>
                    {hasDistricts ? (
                        <Grid container spacing={2}>
                            {districtsWithEmployees.map((district) => {
                                const color = getDistrictColor(district.district);
                                const percentage = totalDistrictEmployees > 0
                                    ? ((district.employeeCount / totalDistrictEmployees) * 100).toFixed(1)
                                    : "0.0";
                                const isClickable = district.district !== "Not assigned";
                                const isSelected = district.district === selectedDistrict;

                                return (
                                    <Grid size={{ xs: 12 }} key={district.district}>
                                        <DistrictCard
                                            district={district.district}
                                            employeeCount={district.employeeCount}
                                            percentage={percentage}
                                            color={color}
                                            isSelected={isSelected}
                                            isClickable={isClickable}
                                            onSelect={() => handleDistrictSelect(district.district)}
                                            onViewEmployees={() => navigate(buildEmployeeListUrl({
                                                district: district.district
                                            }))}
                                        />
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ) : (
                        <Alert severity="info" icon={<LocationOnIcon />}>
                            No district assignments recorded
                        </Alert>
                    )}
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: { xs: "stretch", sm: "center" },
                            justifyContent: "space-between",
                            flexDirection: { xs: "column", sm: "row" },
                            gap: 2,
                            mb: 2
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            By Current Workplace
                        </Typography>
                        {availableDistricts.length > 0 && (
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={selectedDistrict}
                                onChange={(_event, value) => handleDistrictSelect(value)}
                                aria-label="District filter for workplaces"
                            >
                                {availableDistricts.map((district) => (
                                    <ToggleButton
                                        key={district}
                                        value={district}
                                        aria-label={district}
                                        sx={{ textTransform: "none", px: 2 }}
                                    >
                                        {district}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        )}
                    </Box>

                    {selectedDistrict && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                            Showing offices in {selectedDistrict} district only
                        </Typography>
                    )}

                    {hasWorkplaces ? (
                        <ExpandableVerticalBarChart
                            key={selectedDistrict}
                            data={workplaceChartData}
                            chartKey={selectedDistrict}
                            preset="workplace"
                            dialogTitle={`Workplaces in ${selectedDistrict}`}
                            contextLabel={selectedDistrict}
                            onBarClick={handleWorkplaceClick}
                        />
                    ) : (
                        <Alert severity="info" icon={<BusinessIcon />}>
                            {selectedDistrict
                                ? `No workplace data available for ${selectedDistrict}`
                                : "Select a district to view workplaces"}
                        </Alert>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
}
