import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import { getOrganizationSettings as fetchOrganizationSettings } from "../services/organizationSettingsService";
import {
    DEFAULT_ORGANIZATION_SETTINGS,
    getOrganizationSettings as readCachedSettings,
    setOrganizationSettingsCache
} from "../utils/organizationSettingsStore";
import { getStoredUser } from "../hooks/useAuth";

const OrganizationSettingsContext = createContext({
    settings: DEFAULT_ORGANIZATION_SETTINGS,
    loading: false,
    refresh: async () => {},
    applySettings: () => {}
});

export function OrganizationSettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => readCachedSettings());
    const [loading, setLoading] = useState(false);

    const applySettings = useCallback((next) => {
        const cached = setOrganizationSettingsCache(next);
        setSettings(cached);
        return cached;
    }, []);

    const refresh = useCallback(async () => {
        const user = getStoredUser();
        const token = localStorage.getItem("token");
        if (!user || !token) {
            applySettings(DEFAULT_ORGANIZATION_SETTINGS);
            return DEFAULT_ORGANIZATION_SETTINGS;
        }

        setLoading(true);
        try {
            const data = await fetchOrganizationSettings();
            return applySettings(data);
        } catch {
            return readCachedSettings();
        } finally {
            setLoading(false);
        }
    }, [applySettings]);

    useEffect(() => {
        refresh();

        const onStorage = (event) => {
            if (event.key === "token" || event.key === "user") {
                refresh();
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [refresh]);

    const value = useMemo(
        () => ({
            settings,
            loading,
            refresh,
            applySettings,
            primaryDepartmentName: settings.primaryDepartmentName,
            districts: settings.districts,
            provincialCouncilName: settings.provincialCouncilName,
            departmentShortName: settings.departmentShortName,
            applicationName: settings.applicationName,
            councilLabel: settings.councilLabel,
            reportHeaderSubtitle: settings.reportHeaderSubtitle,
            reportHeaderUppercase: settings.reportHeaderUppercase
        }),
        [settings, loading, refresh, applySettings]
    );

    return (
        <OrganizationSettingsContext.Provider value={value}>
            {children}
        </OrganizationSettingsContext.Provider>
    );
}

export function useOrganizationSettings() {
    return useContext(OrganizationSettingsContext);
}
