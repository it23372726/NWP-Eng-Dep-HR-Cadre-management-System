import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HistoryIcon from "@mui/icons-material/History";
import BadgeIcon from "@mui/icons-material/Badge";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import LayersIcon from "@mui/icons-material/Layers";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import SecurityIcon from "@mui/icons-material/Security";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import GroupsIcon from "@mui/icons-material/Groups";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SettingsIcon from "@mui/icons-material/Settings";
import { canViewEmployees, hasPermission } from "./permissions";

export const STANDALONE_NAV_ITEMS = [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon, permission: "DASHBOARD" }
];

export const NAV_SECTIONS = [
    {
        id: "employees",
        label: "Employees",
        icon: GroupsIcon,
        canAccess: canViewEmployees,
        items: [
            {
                label: "Active Employees",
                path: "/employees",
                icon: PeopleAltIcon
            },
            {
                label: "Inactive & History",
                path: "/employees/inactive",
                icon: HistoryIcon
            }
        ]
    },
    {
        id: "organization",
        label: "Organization",
        icon: CorporateFareIcon,
        permission: "ORGANIZATION",
        items: [
            { label: "Designations", path: "/designations", icon: BadgeIcon },
            { label: "Services", path: "/services", icon: ApartmentIcon },
            { label: "Offices", path: "/offices", icon: BusinessIcon },
            {
                label: "Service Levels",
                path: "/service-levels",
                icon: LayersIcon
            },
            { label: "Cadres", path: "/cadres", icon: AccountTreeIcon },
            { label: "Settings", path: "/settings", icon: SettingsIcon }
        ]
    },
    {
        id: "reports",
        label: "Reports",
        icon: AssessmentIcon,
        permission: "REPORTS",
        items: [
            {
                label: "Cadre Vacancy & Excess",
                path: "/vacancies",
                icon: BarChartIcon
            },
            {
                label: "Cadre Report",
                path: "/cadre-report",
                icon: TableChartIcon
            },
            {
                label: "All Employee Details",
                path: "/reports/all-employee-details",
                icon: TableChartIcon
            },
            {
                label: "Changes Report",
                path: "/reports/changes",
                icon: CompareArrowsIcon
            }
        ]
    },
    {
        id: "administration",
        label: "Administration",
        icon: AdminPanelSettingsIcon,
        permission: "ADMINISTRATIONS",
        items: [
            {
                label: "User Management",
                path: "/users",
                icon: ManageAccountsIcon
            },
            {
                label: "Audit Trail",
                path: "/audit-logs",
                icon: SecurityIcon
            }
        ]
    }
];

const TITLE_BY_PATH = [
    ...STANDALONE_NAV_ITEMS,
    ...NAV_SECTIONS.flatMap((section) => section.items)
].reduce((acc, item) => {
    acc[item.path] = item.label;
    return acc;
}, {});

function canAccessNavEntry(user, entry) {
    if (typeof entry.canAccess === "function") {
        return entry.canAccess(user);
    }
    return hasPermission(user, entry.permission);
}

export function getVisibleNavigation(user) {
    const standaloneItems = STANDALONE_NAV_ITEMS.filter((item) =>
        canAccessNavEntry(user, item)
    );

    const sections = NAV_SECTIONS.filter((section) =>
        canAccessNavEntry(user, section)
    ).map((section) => ({
        ...section,
        items: section.items
    }));

    return {
        standaloneItems,
        sections
    };
}

export function getPageTitle(pathname) {
    if (TITLE_BY_PATH[pathname]) {
        return TITLE_BY_PATH[pathname];
    }

    if (pathname.startsWith("/employees/")) {
        return "Employee Profile";
    }

    return "HRMS";
}

export function getActiveSectionId(pathname) {
    const section = NAV_SECTIONS.find((section) =>
        section.items.some((item) => item.path === pathname)
    );
    return section?.id ?? null;
}

export function isPathInSection(pathname, sectionId) {
    const section = NAV_SECTIONS.find((s) => s.id === sectionId);
    return section?.items.some((item) => item.path === pathname) ?? false;
}

export const NAV_EXPAND_STORAGE_KEY = "hrms-nav-expanded-sections";
