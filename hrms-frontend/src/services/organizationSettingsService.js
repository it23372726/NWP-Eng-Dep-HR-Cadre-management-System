import api from "../api/axios";

export const getOrganizationSettings = async () => {
    const response = await api.get("/organization-settings");
    return response.data;
};

export const updateOrganizationSettings = async (data) => {
    const response = await api.put("/organization-settings", data);
    return response.data;
};
