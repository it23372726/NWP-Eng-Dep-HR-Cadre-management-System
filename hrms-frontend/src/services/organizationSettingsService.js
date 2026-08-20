import api from "../api/axios";

export const getOrganizationSettings = async () => {
    const response = await api.get("/organization-settings");
    return response.data;
};

export const getOrganizationBranding = async () => {
    const response = await api.get("/organization-settings/branding");
    return response.data;
};

export const updateOrganizationSettings = async (data) => {
    const response = await api.put("/organization-settings", data);
    return response.data;
};

export const fetchOrganizationLogoBlob = async (cacheKey = "") => {
    const response = await api.get("/organization-settings/logo", {
        params: cacheKey ? { v: cacheKey } : undefined,
        responseType: "blob"
    });
    return response.data;
};

export const uploadOrganizationLogo = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/organization-settings/logo", formData);
    return response.data;
};

export const deleteOrganizationLogo = async () => {
    const response = await api.delete("/organization-settings/logo");
    return response.data;
};
