import api from "../api/axios";

export const searchAuditLogs = async (params) => {
    const response = await api.get("/audit-logs", { params });
    return response.data;
};

export const getAuditLogById = async (id) => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
};

export const exportAuditLogsExcel = async (params) => {
    const response = await api.get("/audit-logs/export/excel", {
        params,
        responseType: "blob"
    });
    return response.data;
};
