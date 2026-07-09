import { canEditEmployees, canViewEmployees, hasPermission as userHasPermission } from "../constants/permissions";

const AUTH_USER_KEY = "user";

export function getStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setStoredUser(user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function useAuth() {
    const user = getStoredUser();

    return {
        user,
        username: user?.username ?? null,
        role: user?.role ?? null,
        permissions: user?.permissions ?? [],
        isSuperAdmin: user?.role === "SUPER_ADMIN",
        hasPermission: (permission) => userHasPermission(user, permission),
        canViewEmployees: () => canViewEmployees(user),
        canEditEmployees: () => canEditEmployees(user)
    };
}
