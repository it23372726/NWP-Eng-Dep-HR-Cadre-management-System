import api from "../api/axios";

export const getEmployees = async () => {
    const response = await api.get("/employees/active");
    return response.data;
};

export const getActiveEmployees = async () => {
    const response = await api.get("/employees/active");
    return response.data;
};

export const getInactiveEmployees = async () => {
    const response = await api.get("/employees/inactive");
    return response.data;
};

export const getEmployeeById = async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
};

export const createEmployee = async (data) => {
    const response = await api.post("/employees", data);
    return response.data;
};

export const updateEmployee = async (id, data) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
};

export const searchEmployees = async (keyword) => {
    const response = await api.get(
        `/employees/search?keyword=${encodeURIComponent(keyword)}`
    );
    return response.data;
};

export const searchInactiveEmployees = async (keyword) => {
    const response = await api.get(
        `/employees/inactive/search?keyword=${encodeURIComponent(keyword)}`
    );
    return response.data;
};
