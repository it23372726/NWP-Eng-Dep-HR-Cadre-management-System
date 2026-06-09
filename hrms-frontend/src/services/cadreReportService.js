import api from "../api/axios";

export const generateCadreReport = async (startDate, endDate) => {
    const response = await api.post("/reports/cadre", {
        startDate,
        endDate
    });
    return response.data;
};

export const downloadCadreReportExcel = async (startDate, endDate) => {
    const response = await api.post(
        "/reports/cadre/export/excel",
        { startDate, endDate },
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadCadreReportPdf = async (startDate, endDate) => {
    const response = await api.post(
        "/reports/cadre/export/pdf",
        { startDate, endDate },
        { responseType: "blob" }
    );
    return response.data;
};

export const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
