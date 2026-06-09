import api from "../api/axios";

export const getDesignations = async () => {

    const response =
        await api.get("/designations");

    return response.data;
};

export const createDesignation = async (
    data
) => {

    const response =
        await api.post(
            "/designations",
            data
        );

    return response.data;
};

export const updateDesignation = async (
    id,
    data
) => {

    const response =
        await api.put(
            `/designations/${id}`,
            data
        );

    return response.data;
};

export const deleteDesignation = async (
    id
) => {

    await api.delete(
        `/designations/${id}`
    );
};

export const searchDesignations = async (
    keyword
) => {

    const response =
        await api.get(
            `/designations/search?keyword=${keyword}`
        );

    return response.data;
};