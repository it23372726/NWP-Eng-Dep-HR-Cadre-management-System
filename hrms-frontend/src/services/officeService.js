import api from "../api/axios";

export const getOffices = async (district) => {
    const params = district ? { district } : undefined;
    const response = await api.get("/offices", { params });
    return response.data;
};

export const createOffice = async (data) => {
    const response = await api.post("/offices", data);
    return response.data;
};

export const updateOffice = async (id, data) => {
    const response = await api.put(`/offices/${id}`, data);
    return response.data;
};

export const deleteOffice = async (id) => {
    await api.delete(`/offices/${id}`);
};
