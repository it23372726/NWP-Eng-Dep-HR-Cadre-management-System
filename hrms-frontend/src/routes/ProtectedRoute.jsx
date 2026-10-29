import { getStoredUser } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
    children,
    employeePortal = false
}) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" />;
    }

    if (getStoredUser()?.role === "EMPLOYEE" && !employeePortal) {
        return <Navigate to="/employees/self" replace />;
    }
    if (employeePortal && getStoredUser()?.role !== "EMPLOYEE") {
        return <Navigate to="/" replace />;
    }
    return children;
}