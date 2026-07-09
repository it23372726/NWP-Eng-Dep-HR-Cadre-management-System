import api from "../api/axios";

export const getRolePermissions = async () => {
    const response = await api.get("/role-permissions");
    return response.data;
};

export const updateRolePermissions = async (role, permissions) => {
    const response = await api.put(`/role-permissions/${role}`, { permissions });
    return response.data;
};
