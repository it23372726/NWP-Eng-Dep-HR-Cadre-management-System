import api from "../api/axios";

export const getUsers = async () => {
    const response = await api.get("/users");
    return response.data;
};

export const getUserById = async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
};

export const createUser = async (data) => {
    const response = await api.post("/users", data);
    return response.data;
};

export const updateUser = async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
};

export const resetUserPassword = async (id, newPassword) => {
    const response = await api.put(`/users/${id}/password`, { newPassword });
    return response.data;
};
