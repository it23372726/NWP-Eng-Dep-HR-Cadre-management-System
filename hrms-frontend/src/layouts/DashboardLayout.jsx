import {
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    Box,
    IconButton,
    Divider,
    Tooltip,
    Breadcrumbs,
    Link,
    useMediaQuery,
    useTheme
} from "@mui/material";

import {
    useNavigate,
    Outlet,
    useLocation
} from "react-router-dom";

import React from "react";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { logout as logoutApi } from "../services/authService";
import { clearAuthData } from "../utils/tokenUtils";
import { getApplicationName } from "../constants/hrms";
import { getPageTitle } from "../constants/navigation";
import { getDefaultRouteForUser } from "../constants/permissions";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { getStoredUser } from "../hooks/useAuth";
import SidebarNav from "../components/layout/SidebarNav";

const drawerWidth = 300;
const collapsedWidth = 76;

function DrawerBranding({ collapsed }) {
    const { applicationName } = useOrganizationSettings();
    const appName = applicationName || getApplicationName();

    return (
        <Box
            sx={{
                px: collapsed ? 1 : 2,
                py: 1.5,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                minHeight: 48
            }}
        >
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    flexShrink: 0
                }}
            >
                HR
            </Box>
            {!collapsed && (
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, lineHeight: 1.2 }}
                        noWrap
                    >
                        {appName}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, letterSpacing: 0.3 }}
                        noWrap
                    >
                        Navigation
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

function DrawerNavContent({ collapsed, onNavigate }) {
    return (
        <>
            <DrawerBranding collapsed={collapsed} />
            <Divider />
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    scrollbarWidth: "thin",
                    scrollbarColor: (theme) =>
                        `${theme.palette.action.disabled} transparent`,
                    "&::-webkit-scrollbar": {
                        width: 6
                    },
                    "&::-webkit-scrollbar-track": {
                        bgcolor: "transparent"
                    },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "action.disabled",
                        borderRadius: 3,
                        "&:hover": {
                            bgcolor: "action.active"
                        }
                    }
                }}
            >
                <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
            </Box>
        </>
    );
}

const drawerPaperSx = {
    boxSizing: "border-box",
    mt: 8,
    height: "calc(100vh - 64px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRight: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper"
};

export default function DashboardLayout() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const pageTitle = getPageTitle(location.pathname);
    const homePath = getDefaultRouteForUser(getStoredUser());

    React.useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const logout = async () => {
        try {
            await logoutApi();
        } catch {
            // Continue local logout even if API call fails
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

    const handleMobileNavigate = () => {
        setMobileOpen(false);
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: 1201
                }}
            >
                <Toolbar>
                    <IconButton
                        edge="start"
                        onClick={handleMenuClick}
                        sx={{ mr: 1 }}
                        aria-label="Toggle navigation"
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "1rem", sm: "1.25rem" }
                            }}
                        >
                            {pageTitle}
                        </Typography>
                        <Breadcrumbs
                            aria-label="breadcrumb"
                            sx={{
                                color: "text.secondary",
                                display: { xs: "none", sm: "flex" }
                            }}
                        >
                            <Link
                                underline="hover"
                                color="inherit"
                                onClick={() => navigate(homePath)}
                                sx={{ cursor: "pointer" }}
                            >
                                Home
                            </Link>
                            <Typography color="text.secondary" noWrap>
                                {pageTitle}
                            </Typography>
                        </Breadcrumbs>
                    </Box>

                    <Tooltip title="Logout">
                        <IconButton onClick={logout} aria-label="Logout">
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        zIndex: 1200,
                        [`& .MuiDrawer-paper`]: {
                            ...drawerPaperSx,
                            width: drawerWidth
                        }
                    }}
                >
                    <DrawerNavContent
                        collapsed={false}
                        onNavigate={handleMobileNavigate}
                    />
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: collapsed ? collapsedWidth : drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: {
                            ...drawerPaperSx,
                            width: collapsed ? collapsedWidth : drawerWidth,
                            transition: (drawerTheme) =>
                                drawerTheme.transitions.create("width", {
                                    easing: drawerTheme.transitions.easing.sharp,
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
                    p: { xs: 2, md: 3 },
                    mt: 10,
                    ml: 0,
                    minWidth: 0
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
