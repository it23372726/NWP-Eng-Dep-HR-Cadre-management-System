import api from "../api/axios";

export const getCadres = async () => {

    const response =
        await api.get("/cadres");

    return response.data;
};

export const createCadre =
async (data) => {

    const response =
        await api.post(
            "/cadres",
            data
        );

    return response.data;
};

export const getVacancyReport =
async () => {

    const response =
        await api.get(
            "/cadres/vacancies"
        );

    return response.data;
};

export const downloadVacancyReportExcel = async () => {
    const response = await api.get(
        "/cadres/vacancies/export/excel",
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadVacancyReportPdf = async () => {
    const response = await api.get(
        "/cadres/vacancies/export/pdf",
        { responseType: "blob" }
    );
    return response.data;
};

export const reorderCadres = async (orderedCadreIds) => {
    await api.put("/cadres/order", { orderedCadreIds });
};

export const updateCadre =
async (id, data) => {

    const response =
        await api.put(
            `/cadres/${id}`,
            data
        );

    return response.data;
};

export const deleteCadre =
async (id) => {

    await api.delete(
        `/cadres/${id}`
    );
};