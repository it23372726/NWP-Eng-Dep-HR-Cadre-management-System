import api from "../api/axios";

export const getAllEmployeeDetailsReport = async () => {
    const response = await api.get("/reports/all-employee-details");
    return response.data;
};

export const downloadAllEmployeeDetailsReportExcel = async () => {
    const response = await api.get(
        "/reports/all-employee-details/export/excel",
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadAllEmployeeDetailsReportPdf = async () => {
    const response = await api.get(
        "/reports/all-employee-details/export/pdf",
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
