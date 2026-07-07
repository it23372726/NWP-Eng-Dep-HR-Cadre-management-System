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
    Link
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
import { getPageTitle } from "../constants/navigation";
import SidebarNav from "../components/layout/SidebarNav";

const drawerWidth = 300;
const collapsedWidth = 76;

export default function DashboardLayout() {

    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = React.useState(false);

    const pageTitle = getPageTitle(location.pathname);

    const logout = async () => {
        try {
            await logoutApi();
        } catch {
            // Continue local logout even if API call fails
        }

        clearAuthData();
        navigate("/");
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
                        onClick={() => setCollapsed((v) => !v)}
                        sx={{ mr: 1 }}
                        aria-label="Toggle navigation"
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {pageTitle}
                        </Typography>
                        <Breadcrumbs
                            aria-label="breadcrumb"
                            sx={{ color: "text.secondary" }}
                        >
                            <Link
                                underline="hover"
                                color="inherit"
                                onClick={() => navigate("/dashboard")}
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

            <Drawer
                variant="permanent"
                sx={{
                    width: collapsed ? collapsedWidth : drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: collapsed ? collapsedWidth : drawerWidth,
                        boxSizing: "border-box",
                        mt: 8,
                        height: "calc(100vh - 64px)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        borderRight: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: (theme) =>
                            theme.transitions.create("width", {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.shorter
                            })
                    }
                }}
            >
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
                                HRMS
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
                    <SidebarNav collapsed={collapsed} />
                </Box>
            </Drawer>

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
