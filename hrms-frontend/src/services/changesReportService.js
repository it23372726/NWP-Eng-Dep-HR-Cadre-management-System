import api from "../api/axios";
import { triggerDownload } from "./cadreReportService";

export { triggerDownload };

export const generateChangesReport = async (year, month) => {
    const response = await api.post("/reports/changes", {
        year,
        month
    });
    return response.data;
};

export const downloadChangesReportExcel = async (year, month) => {
    const response = await api.post(
        "/reports/changes/export/excel",
        { year, month },
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadChangesReportPdf = async (year, month) => {
    const response = await api.post(
        "/reports/changes/export/pdf",
        { year, month },
        { responseType: "blob" }
    );
    return response.data;
};
