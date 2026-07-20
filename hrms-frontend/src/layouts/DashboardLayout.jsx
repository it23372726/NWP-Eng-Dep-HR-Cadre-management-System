import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    AppBar,
    Avatar,
    Box,
    Breadcrumbs,
    Divider,
    Drawer,
    IconButton,
    Link,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import SidebarNav from "../components/layout/SidebarNav";
import { getApplicationName } from "../constants/hrms";
import { getPageTitle } from "../constants/navigation";
import { getDefaultRouteForUser } from "../constants/permissions";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { getStoredUser } from "../hooks/useAuth";
import { logout as logoutApi } from "../services/authService";
import { clearAuthData } from "../utils/tokenUtils";

const DRAWER_WIDTH = 286;
const COLLAPSED_WIDTH = 80;

function getUserInitial(username) {
    return username?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function formatRole(role) {
    if (!role) {
        return "User";
    }
    return role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function DrawerBranding({ collapsed }) {
    const { applicationName } = useOrganizationSettings();
    const appName = applicationName || getApplicationName();

    return (
        <Box
            sx={{
                px: collapsed ? 1.75 : 2.25,
                py: 2,
                minHeight: 78,
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 1.25,
                flexShrink: 0
            }}
        >
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.25,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: "common.white",
                    background: "linear-gradient(135deg, #1767B0 0%, #0C8877 120%)",
                    boxShadow: "0 8px 18px rgba(17, 85, 143, 0.20)"
                }}
            >
                <BadgeOutlinedIcon fontSize="small" />
            </Box>
            {!collapsed && (
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}
                    >
                        {appName}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: "block", mt: 0.35 }}
                    >
                        Workforce workspace
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

function DrawerNavContent({ collapsed, onNavigate }) {
    const user = getStoredUser();

    return (
        <>
            <DrawerBranding collapsed={collapsed} />
            <Divider sx={{ mx: collapsed ? 1.5 : 2, opacity: 0.75 }} />
            <Box
                component="nav"
                aria-label="Primary navigation"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    py: 1,
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(83,97,119,0.28) transparent",
                    "&::-webkit-scrollbar": { width: 5 },
                    "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "rgba(83,97,119,0.24)",
                        borderRadius: 4
                    }
                }}
            >
                <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
            </Box>

            <Divider sx={{ mx: collapsed ? 1.5 : 2, opacity: 0.75 }} />
            <Stack
                direction="row"


                spacing={1.25}
                sx={{alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",  px: collapsed ? 1.5 : 2.25, py: 1.75, minHeight: 74 }}
            >
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "primary.50",
                        color: "primary.main",
                        border: "1px solid",
                        borderColor: "primary.100",
                        fontSize: "0.83rem",
                        fontWeight: 800
                    }}
                >
                    {getUserInitial(user?.username)}
                </Avatar>
                {!collapsed && (
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                            {user?.username || "Signed in user"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {formatRole(user?.role)}
                        </Typography>
                    </Box>
                )}
            </Stack>
        </>
    );
}

const drawerPaperSx = {
    boxSizing: "border-box",
    top: { xs: 64, sm: 72 },
    height: { xs: "calc(100dvh - 64px)", sm: "calc(100dvh - 72px)" },
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRight: "1px solid",
    borderColor: "divider",
    bgcolor: "rgba(255,255,255,0.96)",
    backgroundImage: "linear-gradient(180deg, rgba(238,246,255,0.42) 0%, rgba(255,255,255,0) 16rem)"
};

export default function DashboardLayout() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const navigate = useNavigate();
    const location = useLocation();
    const user = getStoredUser();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const pageTitle = getPageTitle(location.pathname);
    const homePath = getDefaultRouteForUser(user);

    const logout = async () => {
        try {
            await logoutApi();
        } catch {
            // Continue local logout even if the server session has already ended.
        }

        clearAuthData();
        navigate("/");
    };

    const handleMenuClick = () => {
        if (isMobile) {
            setMobileOpen((open) => !open);
            return;
        }
        setCollapsed((value) => !value);
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100dvh" }}>
            <AppBar position="fixed" sx={{ zIndex: (appTheme) => appTheme.zIndex.drawer + 1 }}>
                <Toolbar
                    sx={{
                        minHeight: { xs: "64px !important", sm: "72px !important" },
                        px: { xs: 1.5, sm: 2.5 }
                    }}
                >
                    <IconButton
                        edge="start"
                        onClick={handleMenuClick}
                        aria-label={isMobile ? "Open navigation" : "Toggle navigation width"}
                        sx={{ mr: { xs: 1, sm: 1.5 }, bgcolor: "action.hover" }}
                    >
                        <MenuRoundedIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                            variant="subtitle1"
                            component="div"
                            noWrap
                            sx={{ fontWeight: 780, lineHeight: 1.25, letterSpacing: "-0.02em" }}
                        >
                            {pageTitle}
                        </Typography>
                        <Breadcrumbs
                            aria-label="Breadcrumb"
                            separator="/"
                            sx={{
                                display: { xs: "none", sm: "flex" },
                                mt: 0.15,
                                color: "text.secondary",
                                "& .MuiBreadcrumbs-separator": { mx: 0.75, color: "grey.300" }
                            }}
                        >
                            <Link
                                component="button"
                                type="button"
                                underline="hover"
                                color="inherit"
                                onClick={() => navigate(homePath)}
                                sx={{ fontSize: "0.74rem", lineHeight: 1.3 }}
                            >
                                Home
                            </Link>
                            <Typography color="text.secondary" noWrap sx={{ fontSize: "0.74rem" }}>
                                {pageTitle}
                            </Typography>
                        </Breadcrumbs>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Stack
                            direction="row"
                            spacing={1}

                            sx={{alignItems: "center",  display: { xs: "none", md: "flex" }, mr: 0.5 }}
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: "primary.50",
                                    color: "primary.main",
                                    fontSize: "0.76rem",
                                    fontWeight: 800
                                }}
                            >
                                {getUserInitial(user?.username)}
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ display: "block", fontWeight: 750, lineHeight: 1.2 }}>
                                    {user?.username || "User"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem" }}>
                                    {formatRole(user?.role)}
                                </Typography>
                            </Box>
                        </Stack>
                        <Tooltip title="Sign out">
                            <IconButton onClick={logout} aria-label="Sign out" sx={{ color: "text.secondary" }}>
                                <LogoutRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>

            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        [`& .MuiDrawer-paper`]: {
                            ...drawerPaperSx,
                            width: `min(${DRAWER_WIDTH}px, calc(100vw - 40px))`
                        }
                    }}
                >
                    <DrawerNavContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: {
                            ...drawerPaperSx,
                            width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
                            transition: (drawerTheme) => drawerTheme.transitions.create("width", {
                                easing: drawerTheme.transitions.easing.easeInOut,
                                duration: drawerTheme.transitions.duration.shorter
                            })
                        }
                    }}
                >
                    <DrawerNavContent collapsed={collapsed} />
                </Drawer>
            )}

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    width: "100%",
                    px: { xs: 1.5, sm: 2.5, lg: 3.5 },
                    pt: { xs: 10, sm: 11.5 },
                    pb: { xs: 3, sm: 4 }
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 1700, mx: "auto" }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
