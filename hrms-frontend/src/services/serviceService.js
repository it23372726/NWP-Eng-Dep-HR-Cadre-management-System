import api from "../api/axios";

export const getServices = async () => {

    const response = await api.get("/services");

    return response.data;
};

export const createService = async (data) => {

    const response = await api.post("/services", data);

    return response.data;
};

export const updateService = async (id, data) => {

    const response = await api.put(`/services/${id}`, data);

    return response.data;
};

export const deleteService = async (id) => {

    await api.delete(`/services/${id}`);
};

export const searchServices = async (keyword) => {

    const response = await api.get(
        `/services/search?keyword=${keyword}`
    );

    return response.data;
};
