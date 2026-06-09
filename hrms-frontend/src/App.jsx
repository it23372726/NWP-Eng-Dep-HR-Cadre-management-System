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


import ServiceLevelPage
from "./pages/ServiceLevelPage";

import InactiveEmployeesPage
from "./pages/InactiveEmployeesPage";

import CadreReportPage
from "./pages/CadreReportPage";

import AllEmployeeDetailsReportPage
from "./pages/AllEmployeeDetailsReportPage";


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
                    element={<DashboardPage />}
                />

                <Route
                    path="/employees"
                    element={<EmployeePage />}
                />

                <Route
                    path="/employees/inactive"
                    element={<InactiveEmployeesPage />}
                />

                <Route
                    path="/designations"
                    element={<DesignationPage />}
                />

                <Route
                    path="/services"
                    element={<ServicePage />}
                />

                <Route
                    path="/service-levels"
                    element={<ServiceLevelPage />}
                />

                <Route
                    path="/employees/:id"
                    element={<EmployeeProfilePage />}
                />

                <Route
                    path="/cadres"
                    element={<CadrePage />}
                />

                <Route
                    path="/vacancies"
                    element={<VacancyReportPage />}
                />

                <Route
                    path="/cadre-report"
                    element={<CadreReportPage />}
                />

                <Route
                    path="/reports/all-employee-details"
                    element={<AllEmployeeDetailsReportPage />}
                />

            </Route>

        </Routes>
    );
}