import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { getPageTitle } from "../constants/navigation";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { fetchOrganizationLogoBlob } from "../services/organizationSettingsService";

const DEFAULT_FAVICON = "/favicon.svg";

function upsertFavicon(href, type) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "icon");
        document.head.appendChild(link);
    }
    link.setAttribute("href", href);
    if (type) {
        link.setAttribute("type", type);
    } else {
        link.removeAttribute("type");
    }
}

export default function AppBranding() {
    const location = useLocation();
    const { applicationName, hasLogo, settings } = useOrganizationSettings();
    const appName = applicationName || "HRMS";

    useEffect(() => {
        const pageTitle = getPageTitle(location.pathname);
        document.title = location.pathname === "/"
            ? appName
            : `${pageTitle} · ${appName}`;
    }, [appName, location.pathname]);

    useEffect(() => {
        let objectUrl = null;
        let cancelled = false;

        const setDefaultIcon = () => {
            upsertFavicon(DEFAULT_FAVICON, "image/svg+xml");
        };

        if (!hasLogo) {
            setDefaultIcon();
            return undefined;
        }

        const loadFavicon = async () => {
            try {
                const blob = await fetchOrganizationLogoBlob(settings?.updatedAt);
                if (cancelled) {
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                upsertFavicon(objectUrl);
            } catch {
                if (!cancelled) {
                    setDefaultIcon();
                }
            }
        };

        loadFavicon();

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [hasLogo, settings?.updatedAt]);

    return null;
}
