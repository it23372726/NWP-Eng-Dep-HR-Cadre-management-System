import api from "../api/axios";
import { getStoredUser } from "../hooks/useAuth";

export const getSalaryIncrementHistory = async (id) => {
    const response = await api.get(`/employees/${id}/salary-increment/history`);
    return response.data;
};

export const getSalaryIncrementStatus = async (id, serviceAppointmentKey) => {
    const response = await api.get(getStoredUser()?.role === "EMPLOYEE" ? "/employee-portal/salary-increment" : `/employees/${id}/salary-increment`, { params: { serviceAppointmentKey } });
    return response.data;
};

export const recordSalaryIncrement = async (
    id,
    doneDate,
    { catchUpToCurrentYear = false, catchUpThroughYear, expectedLastOperationId, serviceAppointmentKey } = {}
) => {
    const response = await api.post(`/employees/${id}/salary-increment`, {
        doneDate,
        catchUpToCurrentYear, catchUpThroughYear,
        expectedLastOperationId, serviceAppointmentKey
    });
    return response.data;
};

export const updateSalaryIncrement = async (
    id,
    doneDate,
    { expectedLastOperationId, serviceAppointmentKey } = {}
) => {
    const response = await api.put(`/employees/${id}/salary-increment`, {
        doneDate,
        expectedLastOperationId, serviceAppointmentKey
    });
    return response.data;
};

export const undoSalaryIncrement = async (id, { expectedLastOperationId, serviceAppointmentKey } = {}) => {
    const response = await api.delete(`/employees/${id}/salary-increment`, {
        params: { expectedLastOperationId, serviceAppointmentKey }
    });
    return response.data;
};
