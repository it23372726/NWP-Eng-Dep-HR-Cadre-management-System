import api from "../api/axios";

export const getEmployeeActions = async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/actions`);
    return response.data;
};

export const transferOutEmployee = async (employeeId, data) => {
    const response = await api.post(
        `/employees/${employeeId}/transfer-out`,
        data
    );
    return response.data;
};

export const officeChangeEmployee = async (employeeId, data) => {
    const response = await api.post(
        `/employees/${employeeId}/office-change`,
        data
    );
    return response.data;
};

export const promoteEmployee = async (employeeId, data) => {
    const response = await api.post(
        `/employees/${employeeId}/promote`,
        data
    );
    return response.data;
};

export const retireEmployee = async (employeeId, data) => {
    const response = await api.post(`/employees/${employeeId}/retire`, data);
    return response.data;
};

export const markEmployeeDeath = async (employeeId, data) => {
    const response = await api.post(`/employees/${employeeId}/death`, data);
    return response.data;
};

export const dismissEmployee = async (employeeId, data) => {
    const response = await api.post(`/employees/${employeeId}/dismiss`, data);
    return response.data;
};

export const appointNewEmployee = async (employeeId, data) => {
    const response = await api.post(
        `/employees/${employeeId}/new-appointment`,
        data
    );
    return response.data;
};

export const makeEmployeePermanent = async (employeeId, data) => {
    const response = await api.post(
        `/employees/${employeeId}/make-permanent`,
        data
    );
    return response.data;
};

export const deleteEmployeePermanently = async (employeeId) => {
    const response = await api.delete(`/employees/${employeeId}/permanent`);
    return response.data;
};

export const updateEmployeeAction = async (actionId, data) => {
    const response = await api.put(`/lifecycle-actions/${actionId}`, data);
    return response.data;
};

export const deleteEmployeeAction = async (actionId) => {
    const response = await api.delete(`/lifecycle-actions/${actionId}`);
    return response.data;
};
