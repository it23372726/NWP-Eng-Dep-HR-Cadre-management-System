import api from "../api/axios";

export const getSalaryIncrementStatus = async (id) => {
    const response = await api.get(`/employees/${id}/salary-increment`);
    return response.data;
};

export const recordSalaryIncrement = async (id, doneDate, { catchUpToCurrentYear = false } = {}) => {
    const response = await api.post(`/employees/${id}/salary-increment`, {
        doneDate,
        catchUpToCurrentYear
    });
    return response.data;
};

export const updateSalaryIncrement = async (id, doneDate) => {
    const response = await api.put(`/employees/${id}/salary-increment`, {
        doneDate
    });
    return response.data;
};

export const undoSalaryIncrement = async (id) => {
    const response = await api.delete(`/employees/${id}/salary-increment`);
    return response.data;
};
