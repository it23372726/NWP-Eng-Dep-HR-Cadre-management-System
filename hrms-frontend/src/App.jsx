import {
    Routes,
    Route
} from "react-router-dom";

import LoginPage
from "./pages/LoginPage";

import EmployeePage
from "./pages/EmployeePage";

import DashboardPage
from "./pages/DashboardPage";

import DashboardLayout
from "./layouts/DashboardLayout";

import ProtectedRoute
from "./routes/ProtectedRoute";

import PermissionRoute
from "./routes/PermissionRoute";

import DesignationPage
from "./pages/DesignationPage";


import EmployeeProfilePage
from "./pages/EmployeeProfilePage";

import CadrePage
from "./pages/CadrePage";

import VacancyReportPage
from "./pages/VacancyReportPage";

import ServicePage
from "./pages/ServicePage";

import OfficePage
from "./pages/OfficePage";


import ServiceLevelPage
from "./pages/ServiceLevelPage";

import InactiveEmployeesPage
from "./pages/InactiveEmployeesPage";

import CadreReportPage
from "./pages/CadreReportPage";

import AllEmployeeDetailsReportPage
from "./pages/AllEmployeeDetailsReportPage";

import ChangesReportPage
from "./pages/ChangesReportPage";

import AuditLogPage
from "./pages/AuditLogPage";

import UsersPage
from "./pages/UsersPage";

import OrganizationSettingsPage
from "./pages/OrganizationSettingsPage";


export default function App() {

    return (

        <Routes>

            <Route
                path="/"
                element={<LoginPage />}
            />

            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >

                <Route
                    path="/dashboard"
                    element={
                        <PermissionRoute permission="DASHBOARD">
                            <DashboardPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees"
                    element={
                        <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                            <EmployeePage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees/inactive"
                    element={
                        <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                            <InactiveEmployeesPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/designations"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <DesignationPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/services"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <ServicePage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/offices"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <OfficePage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/service-levels"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <ServiceLevelPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees/:id"
                    element={
                        <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                            <EmployeeProfilePage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/cadres"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <CadrePage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <PermissionRoute permission="ORGANIZATION">
                            <OrganizationSettingsPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/vacancies"
                    element={
                        <PermissionRoute permission="REPORTS">
                            <VacancyReportPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/cadre-report"
                    element={
                        <PermissionRoute permission="REPORTS">
                            <CadreReportPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/reports/all-employee-details"
                    element={
                        <PermissionRoute permission="REPORTS">
                            <AllEmployeeDetailsReportPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/reports/changes"
                    element={
                        <PermissionRoute permission="REPORTS">
                            <ChangesReportPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/audit-logs"
                    element={
                        <PermissionRoute permission="ADMINISTRATIONS">
                            <AuditLogPage />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/users"
                    element={
                        <PermissionRoute permission="ADMINISTRATIONS">
                            <UsersPage />
                        </PermissionRoute>
                    }
                />

            </Route>

        </Routes>
    );
}