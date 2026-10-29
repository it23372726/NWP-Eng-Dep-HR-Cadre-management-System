import api from "../api/axios";

export const login = async (data) => {
    const response = await api.post("/auth/login", data);
    return response.data;
};

export const logout = async () => {
    await api.post("/auth/logout");
};

export const employeeLogin = async (data) => {
    const response = await api.post("/auth/employee-login", data);
    return response.data;
};
