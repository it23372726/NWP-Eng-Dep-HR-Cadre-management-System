import api from "../api/axios";

export const getEmployees = async () => {
    const response = await api.get("/employees/active");
    return response.data;
};

export const getActiveEmployees = async (departmentScope = "NWP") => {
    const response = await api.get("/employees/active", {
        params: { departmentScope }
    });
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

export const uploadEmployeePhoto = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/employees/${id}/photo`, formData);
    return response.data;
};

export const deleteEmployeePhoto = async (id) => {
    const response = await api.delete(`/employees/${id}/photo`);
    return response.data;
};

export const fetchEmployeePhotoBlob = async (id, cacheKey = "") => {
    const response = await api.get(`/employees/${id}/photo`, {
        params: cacheKey ? { v: cacheKey } : undefined,
        responseType: "blob"
    });
    return response.data;
};

export const saveEmployeePhoto = async (id, { photoFile, removePhoto } = {}) => {
    if (photoFile) {
        return uploadEmployeePhoto(id, photoFile);
    }

    if (removePhoto) {
        return deleteEmployeePhoto(id);
    }

    return null;
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

export const getVehiclePermitStatus = async (id) => {
    const response = await api.get(`/employees/${id}/vehicle-permit`);
    return response.data;
};

export const recordVehiclePermitCollection = async (id, collectedDate) => {
    const response = await api.post(`/employees/${id}/vehicle-permit`, {
        collectedDate
    });
    return response.data;
};

export const downloadEmployeeSummaryPdf = async (id) => {
    const response = await api.get(`/employees/${id}/export/summary-pdf`, {
        responseType: "blob"
    });
    return response.data;
};
