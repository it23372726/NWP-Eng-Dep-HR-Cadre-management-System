import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import {
    BrowserRouter
} from "react-router-dom";

import { Toaster }
from "react-hot-toast";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { theme } from "./theme/theme";
import { isTokenExpired, clearAuthData } from "./utils/tokenUtils";
import { OrganizationSettingsProvider } from "./context/OrganizationSettingsContext";

// Validate token on app startup
const token = localStorage.getItem("token");
if (token && isTokenExpired(token)) {
    clearAuthData();
}

ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <BrowserRouter>

        <Toaster position="top-right" />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <OrganizationSettingsProvider>
                    <App />
                </OrganizationSettingsProvider>
            </ThemeProvider>
        </LocalizationProvider>

    </BrowserRouter>
);