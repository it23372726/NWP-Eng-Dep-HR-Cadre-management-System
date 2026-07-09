import { Navigate } from "react-router-dom";
import { getStoredUser } from "../hooks/useAuth";
import {
    getDefaultRouteForUser,
    hasAnyPermission,
    hasPermission
} from "../constants/permissions";

export default function PermissionRoute({ children, permission, anyOf }) {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token) {
        return <Navigate to="/" />;
    }

    const allowed = Array.isArray(anyOf) && anyOf.length > 0
        ? hasAnyPermission(user, anyOf)
        : hasPermission(user, permission);

    if (!allowed) {
        return <Navigate to={getDefaultRouteForUser(user)} replace />;
    }

    return children;
}
