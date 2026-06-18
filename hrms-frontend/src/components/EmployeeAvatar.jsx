import { useEffect, useRef, useState } from "react";

import PersonIcon from "@mui/icons-material/Person";
import { Avatar, CircularProgress } from "@mui/material";

import { EMPLOYEE_PHOTO_SIZE } from "../constants/hrms";
import { fetchEmployeePhotoBlob } from "../services/employeeService";

const avatarSx = (size) => ({
    width: size,
    height: size,
    bgcolor: "grey.200",
    color: "text.secondary"
});

export default function EmployeeAvatar({ employee, size = EMPLOYEE_PHOTO_SIZE }) {
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const photoUrlRef = useRef(null);

    const revokePhotoUrl = () => {
        if (photoUrlRef.current) {
            URL.revokeObjectURL(photoUrlRef.current);
            photoUrlRef.current = null;
        }
    };

    useEffect(() => {
        revokePhotoUrl();
        setPhotoUrl(null);

        if (!employee?.id || !employee?.profilePhotoPath) {
            setLoading(false);
            return undefined;
        }

        let cancelled = false;

        const loadPhoto = async () => {
            setLoading(true);
            try {
                const cacheKey = employee.updatedAt || employee.profilePhotoPath;
                const blob = await fetchEmployeePhotoBlob(employee.id, cacheKey);
                if (cancelled) {
                    return;
                }
                const url = URL.createObjectURL(blob);
                photoUrlRef.current = url;
                setPhotoUrl(url);
            } catch {
                if (!cancelled) {
                    setPhotoUrl(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadPhoto();

        return () => {
            cancelled = true;
            revokePhotoUrl();
        };
    }, [
        employee?.id,
        employee?.profilePhotoPath,
        employee?.updatedAt
    ]);

    if (loading) {
        return (
            <Avatar sx={avatarSx(size)}>
                <CircularProgress size={Math.round(size * 0.35)} />
            </Avatar>
        );
    }

    if (photoUrl) {
        return (
            <Avatar
                src={photoUrl}
                alt={employee?.fullName ? `${employee.fullName} profile photo` : "Employee profile photo"}
                sx={{
                    ...avatarSx(size),
                    bgcolor: "grey.100"
                }}
                imgProps={{ style: { objectFit: "cover" } }}
            />
        );
    }

    return (
        <Avatar sx={avatarSx(size)}>
            <PersonIcon sx={{ fontSize: Math.round(size * 0.45) }} />
        </Avatar>
    );
}
