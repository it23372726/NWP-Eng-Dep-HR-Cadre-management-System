import { Box } from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { useEffect, useRef, useState } from "react";

import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { fetchOrganizationLogoBlob } from "../services/organizationSettingsService";

export default function OrganizationLogo({
    size = 42,
    alt,
    fallbackIcon,
    inverted = false
}) {
    const { applicationName, hasLogo, settings } = useOrganizationSettings();
    const [logoUrl, setLogoUrl] = useState(null);
    const logoUrlRef = useRef(null);
    const logoAlt = alt || `${applicationName || "HRMS"} logo`;

    useEffect(() => {
        if (logoUrlRef.current) {
            URL.revokeObjectURL(logoUrlRef.current);
            logoUrlRef.current = null;
        }
        setLogoUrl(null);

        if (!hasLogo) {
            return undefined;
        }

        let cancelled = false;

        const loadLogo = async () => {
            try {
                const blob = await fetchOrganizationLogoBlob(settings?.updatedAt);
                if (cancelled) {
                    return;
                }
                const url = URL.createObjectURL(blob);
                logoUrlRef.current = url;
                setLogoUrl(url);
            } catch {
                if (!cancelled) {
                    setLogoUrl(null);
                }
            }
        };

        loadLogo();

        return () => {
            cancelled = true;
            if (logoUrlRef.current) {
                URL.revokeObjectURL(logoUrlRef.current);
                logoUrlRef.current = null;
            }
        };
    }, [hasLogo, settings?.updatedAt]);

    if (logoUrl) {
        return (
            <Box
                component="img"
                src={logoUrl}
                alt={logoAlt}
                sx={{
                    width: size,
                    height: size,
                    objectFit: "contain",
                    borderRadius: 1.5,
                    flexShrink: 0,
                    bgcolor: inverted ? "rgba(255,255,255,0.12)" : "background.paper"
                }}
            />
        );
    }

    if (fallbackIcon) {
        return fallbackIcon;
    }

    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: 2.25,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: "common.white",
                background: inverted
                    ? "rgba(255,255,255,0.12)"
                    : "linear-gradient(135deg, #1767B0 0%, #0C8877 120%)"
            }}
        >
            <BadgeOutlinedIcon sx={{ fontSize: Math.round(size * 0.48) }} />
        </Box>
    );
}
