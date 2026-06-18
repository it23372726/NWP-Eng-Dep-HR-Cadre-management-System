import {
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Button,
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
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HistoryIcon from "@mui/icons-material/History";
import BadgeIcon from "@mui/icons-material/Badge";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import LayersIcon from "@mui/icons-material/Layers";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";

const drawerWidth = 280;
const collapsedWidth = 76;

const NAV_ITEMS = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Active Employees", path: "/employees", icon: <PeopleAltIcon /> },
    {
        label: "Inactive / History",
        path: "/employees/inactive",
        icon: <HistoryIcon />
    },
    { label: "Designations", path: "/designations", icon: <BadgeIcon /> },
    { label: "Services", path: "/services", icon: <ApartmentIcon /> },
    { label: "Offices", path: "/offices", icon: <BusinessIcon /> },
    { label: "Service Levels", path: "/service-levels", icon: <LayersIcon /> },
    { label: "Cadres", path: "/cadres", icon: <AccountTreeIcon /> },
    {
        label: "Cadre Vacancy & Excess",
        path: "/vacancies",
        icon: <AssessmentIcon />
    },
    { label: "Cadre Report", path: "/cadre-report", icon: <AssessmentIcon /> },
    {
        label: "All Employee Details Report",
        path: "/reports/all-employee-details",
        icon: <AssessmentIcon />
    }
];

const TITLE_BY_PATH = NAV_ITEMS.reduce((acc, item) => {
    acc[item.path] = item.label;
    return acc;
}, {});

export default function DashboardLayout() {

    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = React.useState(false);

    const pageTitle =
        TITLE_BY_PATH[location.pathname] ||
        (location.pathname.startsWith("/employees/")
            ? "Employee Profile"
            : "HRMS");

    const logout = () => {

        localStorage.removeItem("token");

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
                            display: collapsed ? "none" : "block"
                        }}
                    >
                        Navigation
                    </Typography>
                </Box>

                <Divider />

                <List sx={{ py: 1 }}>

                    {NAV_ITEMS.map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <ListItem key={item.path} disablePadding sx={{ px: 1 }}>
                                <Tooltip
                                    title={collapsed ? item.label : ""}
                                    placement="right"
                                >
                                    <ListItemButton
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            borderRadius: 2,
                                            mb: 0.5,
                                            px: collapsed ? 1.5 : 2,
                                            "&.Mui-selected": {
                                                bgcolor: "action.selected",
                                                "&:hover": { bgcolor: "action.selected" }
                                            }
                                        }}
                                        selected={active}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                mr: collapsed ? 0 : 1.5,
                                                color: active
                                                    ? "primary.main"
                                                    : "text.secondary",
                                                display: "flex",
                                                justifyContent: "center"
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        {!collapsed && (
                                            <ListItemText
                                                primary={item.label}
                                                slotProps={{
                                                    primary: {
                                                        sx: {
                                                            fontWeight: active ? 750 : 600,
                                                            fontSize: "0.92rem"
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        );
                    })}

                </List>

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