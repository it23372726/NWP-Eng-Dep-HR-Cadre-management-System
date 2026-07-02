import { Navigate } from "react-router-dom";
import { getStoredUser } from "../hooks/useAuth";

export default function SuperAdminRoute({ children }) {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token) {
        return <Navigate to="/" />;
    }

    if (user?.role !== "SUPER_ADMIN") {
        return <Navigate to="/dashboard" />;
    }

    return children;
}
