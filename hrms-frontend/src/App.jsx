import { lazy, Suspense } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Route, Routes } from "react-router-dom";

import PermissionRoute from "./routes/PermissionRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmployeePage = lazy(() => import("./pages/EmployeePage"));
const InactiveEmployeesPage = lazy(() => import("./pages/InactiveEmployeesPage"));
const EmployeeProfilePage = lazy(() => import("./pages/EmployeeProfilePage"));
const DesignationPage = lazy(() => import("./pages/DesignationPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const OfficePage = lazy(() => import("./pages/OfficePage"));
const ServiceLevelPage = lazy(() => import("./pages/ServiceLevelPage"));
const CadrePage = lazy(() => import("./pages/CadrePage"));
const OrganizationSettingsPage = lazy(() => import("./pages/OrganizationSettingsPage"));
const VacancyReportPage = lazy(() => import("./pages/VacancyReportPage"));
const CadreReportPage = lazy(() => import("./pages/CadreReportPage"));
const AllEmployeeDetailsReportPage = lazy(() => import("./pages/AllEmployeeDetailsReportPage"));
const ChangesReportPage = lazy(() => import("./pages/ChangesReportPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));

function PageLoader() {
    return (
        <Box
            role="status"
            aria-live="polite"
            sx={{
                minHeight: "45vh",
                display: "grid",
                placeItems: "center"
            }}
        >
            <Box sx={{ textAlign: "center" }}>
                <CircularProgress size={30} thickness={4} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Loading workspace…
                </Typography>
            </Box>
        </Box>
    );
}

export default function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<LoginPage />} />

                <Route
                    element={(
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    )}
                >
                    <Route
                        path="/dashboard"
                        element={(
                            <PermissionRoute permission="DASHBOARD">
                                <DashboardPage />
                            </PermissionRoute>
                        )}
                    />
                    <Route
                        path="/employees"
                        element={(
                            <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                                <EmployeePage />
                            </PermissionRoute>
                        )}
                    />
                    <Route
                        path="/employees/inactive"
                        element={(
                            <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                                <InactiveEmployeesPage />
                            </PermissionRoute>
                        )}
                    />
                    <Route
                        path="/employees/:id"
                        element={(
                            <PermissionRoute anyOf={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
                                <EmployeeProfilePage />
                            </PermissionRoute>
                        )}
                    />
                    <Route path="/designations" element={<PermissionRoute permission="ORGANIZATION"><DesignationPage /></PermissionRoute>} />
                    <Route path="/services" element={<PermissionRoute permission="ORGANIZATION"><ServicePage /></PermissionRoute>} />
                    <Route path="/offices" element={<PermissionRoute permission="ORGANIZATION"><OfficePage /></PermissionRoute>} />
                    <Route path="/service-levels" element={<PermissionRoute permission="ORGANIZATION"><ServiceLevelPage /></PermissionRoute>} />
                    <Route path="/cadres" element={<PermissionRoute permission="ORGANIZATION"><CadrePage /></PermissionRoute>} />
                    <Route path="/settings" element={<PermissionRoute permission="ORGANIZATION"><OrganizationSettingsPage /></PermissionRoute>} />
                    <Route path="/vacancies" element={<PermissionRoute permission="REPORTS"><VacancyReportPage /></PermissionRoute>} />
                    <Route path="/cadre-report" element={<PermissionRoute permission="REPORTS"><CadreReportPage /></PermissionRoute>} />
                    <Route path="/reports/all-employee-details" element={<PermissionRoute permission="REPORTS"><AllEmployeeDetailsReportPage /></PermissionRoute>} />
                    <Route path="/reports/changes" element={<PermissionRoute permission="REPORTS"><ChangesReportPage /></PermissionRoute>} />
                    <Route path="/audit-logs" element={<PermissionRoute permission="ADMINISTRATIONS"><AuditLogPage /></PermissionRoute>} />
                    <Route path="/users" element={<PermissionRoute permission="ADMINISTRATIONS"><UsersPage /></PermissionRoute>} />
                </Route>
            </Routes>
        </Suspense>
    );
}
