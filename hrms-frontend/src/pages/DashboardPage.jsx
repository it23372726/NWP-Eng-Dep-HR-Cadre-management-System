import React, { useEffect, useState } from "react";
import {
    Box,
    Alert,
    CircularProgress,
    Typography,
    Stack,
    Button,
    Tooltip,
    Tabs,
    Tab
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import toast from "react-hot-toast";
import { getComprehensiveDashboard } from "../services/dashboardService";
import { getApiErrorMessage } from "../constants/hrms";
import AttentionRequiredPanel from "../components/AttentionRequiredPanel";
import WorkforceSummaryCards from "../components/WorkforceSummaryCards";
import ServiceDistributionChart from "../components/ServiceDistributionChart";
import ServiceLevelDistributionChart from "../components/ServiceLevelDistributionChart";
import DesignationDistributionChart from "../components/DesignationDistributionChart";
import GradeDistributionChart from "../components/GradeDistributionChart";
import PermanentStatusChart from "../components/PermanentStatusChart";
import PromotionPipelinePanel from "../components/PromotionPipelinePanel";
import RetirementForecastCard from "../components/RetirementForecastCard";
import GeographicDistributionPanel from "../components/GeographicDistributionPanel";
import RecentMovementsTable from "../components/RecentMovementsTable";
import RecentEmployeesWidget from "../components/RecentEmployeesWidget";
import BirthdaysWidget from "../components/BirthdaysWidget";
import DashboardSection, { dashboardGrid } from "../components/DashboardSection";

const DASHBOARD_TABS = {
    OVERVIEW: 0,
    RECENT_ACTIVITY: 1
};

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.OVERVIEW);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const response = await getComprehensiveDashboard();
            setData(response);
            setLastUpdated(new Date());
        } catch (err) {
            const errorMsg = getApiErrorMessage(err);
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatLastUpdated = () => {
        if (!lastUpdated) {
            return null;
        }
        return lastUpdated.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        HR Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        N.W.P. Engineering Department workforce overview
                    </Typography>
                    {lastUpdated && (
                        <Typography variant="caption" color="text.secondary">
                            Last updated: {formatLastUpdated()}
                        </Typography>
                    )}
                </Box>
                <Tooltip title="Refresh dashboard">
                    <span>
                        <Button
                            variant="outlined"
                            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={() => loadDashboardData(true)}
                            disabled={loading || refreshing}
                        >
                            Refresh
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Workforce Overview" />
                    <Tab label="Recent Activity" />
                </Tabs>
            </Box>

            {activeTab === DASHBOARD_TABS.OVERVIEW && (
                <>
                    <AttentionRequiredPanel alerts={data?.alerts} loading={loading} />

                    <DashboardSection
                        title="Workforce Summary"
                        description="Key headcount and action metrics at a glance"
                    >
                        <WorkforceSummaryCards summary={data?.summary} loading={loading} />
                    </DashboardSection>

                    <DashboardSection
                        title="Workforce Distribution"
                        description="How employees are spread across services, levels, and permanent status"
                    >
                        <Box sx={dashboardGrid.threeCol}>
                            <ServiceDistributionChart
                                data={data?.serviceDistribution}
                                loading={loading}
                            />
                            <ServiceLevelDistributionChart
                                data={data?.serviceLevelDistribution}
                                loading={loading}
                            />
                            <PermanentStatusChart
                                data={data?.permanentStatusDistribution}
                                loading={loading}
                            />
                        </Box>
                    </DashboardSection>

                    <DashboardSection
                        title="Role & Grade Structure"
                        description="Designation concentration and grade pyramid for promotion planning"
                    >
                        <Box sx={dashboardGrid.twoCol}>
                            <DesignationDistributionChart
                                data={data?.designationDistribution}
                                loading={loading}
                            />
                            <GradeDistributionChart
                                data={data?.gradeDistribution}
                                loading={loading}
                            />
                        </Box>
                    </DashboardSection>

                    <DashboardSection
                        title="Career & Retirement Pipeline"
                        description="Upcoming promotions, confirmations, and retirement planning"
                    >
                        <Box sx={dashboardGrid.twoCol}>
                            <PromotionPipelinePanel summary={data?.summary} loading={loading} />
                            <RetirementForecastCard
                                data={data?.retirementForecast}
                                loading={loading}
                            />
                        </Box>
                    </DashboardSection>

                    <DashboardSection
                        title="Geographic Distribution"
                        description="Staff placement by district and current workplace"
                    >
                        <GeographicDistributionPanel
                            districtData={data?.districtDistribution}
                            workplaceDistributionByDistrict={data?.workplaceDistributionByDistrict}
                            loading={loading}
                        />
                    </DashboardSection>
                </>
            )}

            {activeTab === DASHBOARD_TABS.RECENT_ACTIVITY && (
                <DashboardSection
                    title="Recent Activity"
                    description="Latest lifecycle actions and workforce changes"
                >
                    <Box sx={{ mb: 3 }}>
                        <RecentMovementsTable data={data?.recentMovements} loading={loading} />
                    </Box>
                    <Box sx={dashboardGrid.twoCol}>
                        <BirthdaysWidget
                            data={data?.birthdaysThisMonth}
                            loading={loading}
                        />
                        <RecentEmployeesWidget
                            data={data?.recentlyAddedEmployees}
                            loading={loading}
                        />
                    </Box>
                </DashboardSection>
            )}
        </Box>
    );
}
