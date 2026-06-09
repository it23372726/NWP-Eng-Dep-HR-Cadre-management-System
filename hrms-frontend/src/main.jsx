import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import {
    BrowserRouter
} from "react-router-dom";

import { Toaster }
from "react-hot-toast";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme/theme";
import { isTokenExpired, clearAuthData } from "./utils/tokenUtils";

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

        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>

    </BrowserRouter>
);