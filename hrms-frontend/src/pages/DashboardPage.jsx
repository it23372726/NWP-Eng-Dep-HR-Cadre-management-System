import React, { useEffect, useState } from "react";
import { Box, Alert, CircularProgress, Container } from "@mui/material";
import toast from "react-hot-toast";
import { getComprehensiveDashboard } from "../services/dashboardService";
import { getApiErrorMessage } from "../constants/hrms";
import SummaryCards from "../components/SummaryCards";
import DashboardAlerts from "../components/DashboardAlerts";
import ServiceDistributionChart from "../components/ServiceDistributionChart";
import ServiceLevelDistributionChart from "../components/ServiceLevelDistributionChart";
import CadreStatusTable from "../components/CadreStatusTable";
import DistrictDistributionCard from "../components/DistrictDistributionCard";
import RecentMovementsTable from "../components/RecentMovementsTable";
import RetirementWatchListTable from "../components/RetirementWatchListTable";
import RecentEmployeesWidget from "../components/RecentEmployeesWidget";
import QuickReportsSection from "../components/QuickReportsSection";

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getComprehensiveDashboard();
            setData(response);
        } catch (err) {
            const errorMsg = getApiErrorMessage(err);
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ mb: 4 }}>
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* ALERTS SECTION */}
            <DashboardAlerts alerts={data?.alerts} loading={loading} />

            {/* SUMMARY CARDS */}
            <SummaryCards summary={data?.summary} loading={loading} />

            {/* ALERTS DETAILED */}
            {!loading && data?.alerts && data.alerts.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {data.alerts.map((alert, idx) => (
                        <Alert key={idx} severity={alert.severity === "error" ? "error" : alert.severity === "warning" ? "warning" : "info"} sx={{ mb: 2 }}>
                            <strong>{alert.message}:</strong> {alert.count} {alert.type}
                        </Alert>
                    ))}
                </Box>
            )}

            {/* DISTRIBUTION CHARTS */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 4 }}>
                <ServiceLevelDistributionChart data={data?.serviceLevelDistribution} loading={loading} />
                <ServiceDistributionChart data={data?.serviceDistribution} loading={loading} />
            </Box>

            {/* CADRE STATUS */}
            <Box sx={{ mb: 4 }}>
                <CadreStatusTable data={data?.cadreStatus} loading={loading} />
            </Box>

            {/* DISTRICT DISTRIBUTION */}
            <Box sx={{ mb: 4 }}>
                <DistrictDistributionCard data={data?.districtDistribution} loading={loading} />
            </Box>

            {/* RECENT MOVEMENTS */}
            <Box sx={{ mb: 4 }}>
                <RecentMovementsTable data={data?.recentMovements} loading={loading} />
            </Box>

            {/* RETIREMENT WATCH */}
            <Box sx={{ mb: 4 }}>
                <RetirementWatchListTable data={data?.retirementWatchList} loading={loading} />
            </Box>

            {/* BIRTHDAYS & RECENT EMPLOYEES */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 4 }}>
                <RecentEmployeesWidget data={data?.recentlyAddedEmployees} loading={loading} />
            </Box>

            {/* QUICK REPORTS */}
            <Box sx={{ mb: 4 }}>
                <QuickReportsSection />
            </Box>
        </Box>
    );
}
