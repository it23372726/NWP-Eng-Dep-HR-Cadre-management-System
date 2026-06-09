import api from "../api/axios";

export const getDashboardStats = async () => {
    const response = await api.get("/dashboard/stats");
    return response.data;
};

export const getDashboardSummary = async () => {
    const response = await api.get("/dashboard/summary");
    return response.data;
};

export const getComprehensiveDashboard = async () => {
    const response = await api.get("/dashboard/comprehensive");
    return response.data;
};

export const getServiceLevelDistribution = async () => {
    const response = await api.get("/dashboard/service-level-distribution");
    return response.data;
};

export const getServiceDistribution = async () => {
    const response = await api.get("/dashboard/service-distribution");
    return response.data;
};

export const getCadreStatus = async () => {
    const response = await api.get("/dashboard/cadre-status");
    return response.data;
};

export const getDistrictDistribution = async () => {
    const response = await api.get("/dashboard/district-distribution");
    return response.data;
};

export const getRecentMovements = async () => {
    const response = await api.get("/dashboard/recent-movements");
    return response.data;
};

export const getRetirementWatch = async () => {
    const response = await api.get("/dashboard/retirement-watch");
    return response.data;
};

export const getBirthdays = async () => {
    const response = await api.get("/dashboard/birthdays");
    return response.data;
};

export const getRecentEmployees = async () => {
    const response = await api.get("/dashboard/recent-employees");
    return response.data;
};

export const getDashboardAlerts = async () => {
    const response = await api.get("/dashboard/alerts");
    return response.data;
};
