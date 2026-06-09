import api from "../api/axios";

export const getServiceLevels = async () => {
    const response = await api.get("/service-levels");
    return response.data;
};

export const getServiceLevelById = async (id) => {
    const response = await api.get(`/service-levels/${id}`);
    return response.data;
};

export const createServiceLevel = async (data) => {
    const response = await api.post("/service-levels", data);
    return response.data;
};

export const updateServiceLevel = async (id, data) => {
    const response = await api.put(`/service-levels/${id}`, data);
    return response.data;
};

export const deleteServiceLevel = async (id) => {
    await api.delete(`/service-levels/${id}`);
};
