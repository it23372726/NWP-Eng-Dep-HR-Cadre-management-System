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

                    [`& .MuiDrawer-paper`]: {

                        width: collapsed ? collapsedWidth : drawerWidth,
                        boxSizing: "border-box",
                        mt: 8,
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

                <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: "text.secondary",
                            px: 1,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            display: collapsed ? "none" : "block"
                        }}
                    >
                        HRMS
                    </Typography>
                </Box>

                <Divider />

                <SidebarNav collapsed={collapsed} />

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
