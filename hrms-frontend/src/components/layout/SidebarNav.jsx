import React from "react";
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Divider,
    Tooltip,
    Popover,
    Typography,
    Box
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    getVisibleNavigation,
    getActiveSectionId,
    isPathInSection,
    NAV_EXPAND_STORAGE_KEY
} from "../../constants/navigation";
import { getStoredUser } from "../../hooks/useAuth";

function loadExpandedSections() {
    try {
        const stored = sessionStorage.getItem(NAV_EXPAND_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // ignore
    }
    return {};
}

function saveExpandedSections(state) {
    try {
        sessionStorage.setItem(NAV_EXPAND_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore
    }
}

function NavIcon({ icon: Icon, active, sx = {} }) {
    return (
        <ListItemIcon
            sx={{
                minWidth: 0,
                mr: 1.5,
                color: active ? "primary.main" : "text.secondary",
                display: "flex",
                justifyContent: "center",
                ...sx
            }}
        >
            <Icon fontSize="small" />
        </ListItemIcon>
    );
}

function navItemSx({ active, collapsed, nested = false }) {
    return {
        borderRadius: 2,
        mb: 0.35,
        pl: nested ? 3.5 : collapsed ? 1.5 : 2,
        pr: collapsed ? 1.5 : 2,
        py: nested ? 0.65 : 0.85,
        borderLeft: active ? "3px solid" : "3px solid transparent",
        borderColor: active ? "primary.main" : "transparent",
        bgcolor: active ? "action.selected" : "transparent",
        "&:hover": {
            bgcolor: active ? "action.selected" : "action.hover"
        },
        "&.Mui-selected": {
            bgcolor: "action.selected",
            "&:hover": { bgcolor: "action.selected" }
        }
    };
}

function NavLeafButton({
    item,
    active,
    collapsed,
    onNavigate,
    nested = false
}) {
    const Icon = item.icon;

    return (
        <ListItem disablePadding sx={{ px: 1 }}>
            <Tooltip title={collapsed ? item.label : ""} placement="right">
                <ListItemButton
                    onClick={() => onNavigate(item.path)}
                    selected={active}
                    sx={navItemSx({ active, collapsed, nested })}
                >
                    {Icon && (
                        <NavIcon
                            icon={Icon}
                            active={active}
                            sx={{ mr: collapsed ? 0 : 1.5, minWidth: nested ? 32 : 0 }}
                        />
                    )}
                    {!collapsed && (
                        <ListItemText
                            primary={item.label}
                            slotProps={{
                                primary: {
                                    sx: {
                                        fontWeight: active ? 750 : 600,
                                        fontSize: nested ? "0.875rem" : "0.92rem"
                                    }
                                }
                            }}
                        />
                    )}
                </ListItemButton>
            </Tooltip>
        </ListItem>
    );
}

function CollapsedSectionFlyout({ section, location, onNavigate }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const SectionIcon = section.icon;
    const sectionActive = isPathInSection(location.pathname, section.id);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNavigate = (path) => {
        handleClose();
        onNavigate(path);
    };

    return (
        <>
            <ListItem disablePadding sx={{ px: 1 }}>
                <Tooltip title={section.label} placement="right">
                    <ListItemButton
                        onClick={handleOpen}
                        sx={{
                            borderRadius: 2,
                            mb: 0.35,
                            px: 1.5,
                            py: 0.85,
                            justifyContent: "center",
                            borderLeft: sectionActive ? "3px solid" : "3px solid transparent",
                            borderColor: sectionActive ? "primary.main" : "transparent",
                            bgcolor: open || sectionActive ? "action.selected" : "transparent",
                            "&:hover": {
                                bgcolor: "action.hover"
                            }
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                color: sectionActive
                                    ? "primary.main"
                                    : "text.secondary",
                                display: "flex",
                                justifyContent: "center"
                            }}
                        >
                            <SectionIcon />
                        </ListItemIcon>
                    </ListItemButton>
                </Tooltip>
            </ListItem>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        sx: { minWidth: 220, py: 0.5 }
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: "text.secondary" }}
                    >
                        {section.label}
                    </Typography>
                </Box>
                <List dense disablePadding>
                    {section.items.map((item) => {
                        const active = location.pathname === item.path;
                        const ItemIcon = item.icon;
                        return (
                            <ListItem key={item.path} disablePadding>
                                <ListItemButton
                                    selected={active}
                                    onClick={() => handleNavigate(item.path)}
                                    sx={{
                                        px: 2,
                                        "&.Mui-selected": {
                                            bgcolor: "action.selected"
                                        }
                                    }}
                                >
                                    {ItemIcon && (
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <ItemIcon
                                                fontSize="small"
                                                color={active ? "primary" : "inherit"}
                                            />
                                        </ListItemIcon>
                                    )}
                                    <ListItemText
                                        primary={item.label}
                                        slotProps={{
                                            primary: {
                                                sx: {
                                                    fontWeight: active ? 700 : 500,
                                                    fontSize: "0.875rem"
                                                }
                                            }
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Popover>
        </>
    );
}

function ExpandedSection({ section, expanded, onToggle, location, onNavigate }) {
    const SectionIcon = section.icon;
    const sectionActive = isPathInSection(location.pathname, section.id);

    return (
        <>
            <ListItem disablePadding sx={{ px: 1 }}>
                <ListItemButton
                    onClick={onToggle}
                    sx={{
                        borderRadius: 2,
                        mb: 0.25,
                        px: 2,
                        py: 0.85,
                        bgcolor: expanded ? "action.hover" : "transparent",
                        "&:hover": {
                            bgcolor: "action.hover"
                        }
                    }}
                >
                    <NavIcon icon={SectionIcon} active={sectionActive} />
                    <ListItemText
                        primary={section.label}
                        slotProps={{
                            primary: {
                                sx: {
                                    fontWeight: sectionActive ? 700 : 600,
                                    fontSize: "0.92rem",
                                    color: sectionActive
                                        ? "primary.main"
                                        : "text.primary"
                                }
                            }
                        }}
                    />
                    {expanded ? (
                        <ExpandLessIcon
                            fontSize="small"
                            sx={{ color: "text.secondary" }}
                        />
                    ) : (
                        <ExpandMoreIcon
                            fontSize="small"
                            sx={{ color: "text.secondary" }}
                        />
                    )}
                </ListItemButton>
            </ListItem>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <List dense disablePadding sx={{ pb: 0.5 }}>
                    {section.items.map((item) => (
                        <NavLeafButton
                            key={item.path}
                            item={item}
                            active={location.pathname === item.path}
                            collapsed={false}
                            onNavigate={onNavigate}
                            nested
                        />
                    ))}
                </List>
            </Collapse>
        </>
    );
}

export default function SidebarNav({ collapsed, onNavigate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getStoredUser();
    const { standaloneItems, sections } = getVisibleNavigation(user);
    const activeSectionId = getActiveSectionId(location.pathname);

    const [expandedSections, setExpandedSections] = React.useState(() => {
        const stored = loadExpandedSections();
        if (activeSectionId) {
            return { ...stored, [activeSectionId]: true };
        }
        return stored;
    });

    React.useEffect(() => {
        if (activeSectionId) {
            setExpandedSections((prev) => {
                const next = { ...prev, [activeSectionId]: true };
                saveExpandedSections(next);
                return next;
            });
        }
    }, [activeSectionId]);

    const toggleSection = (sectionId) => {
        setExpandedSections((prev) => {
            const next = { ...prev, [sectionId]: !prev[sectionId] };
            saveExpandedSections(next);
            return next;
        });
    };

    const handleNavigate = (path) => {
        navigate(path);
        onNavigate?.();
    };

    return (
        <List dense sx={{ py: 1, px: 0, pb: 2 }}>
            {standaloneItems.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;

                return (
                    <ListItem key={item.path} disablePadding sx={{ px: 1 }}>
                        <Tooltip
                            title={collapsed ? item.label : ""}
                            placement="right"
                        >
                            <ListItemButton
                                onClick={() => handleNavigate(item.path)}
                                selected={active}
                                sx={navItemSx({ active, collapsed })}
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
                                    <Icon />
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

            {sections.map((section) => (
                <React.Fragment key={section.id}>
                    <Divider sx={{ my: 0.75, mx: 1.5, opacity: 0.8 }} />
                    {collapsed ? (
                        <CollapsedSectionFlyout
                            section={section}
                            location={location}
                            onNavigate={handleNavigate}
                        />
                    ) : (
                        <ExpandedSection
                            section={section}
                            expanded={Boolean(expandedSections[section.id])}
                            onToggle={() => toggleSection(section.id)}
                            location={location}
                            onNavigate={handleNavigate}
                        />
                    )}
                </React.Fragment>
            ))}
        </List>
    );
}
