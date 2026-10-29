import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    TextField,
    Tabs,
    Tab,
    Typography
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";

import { getApplicationName } from "../constants/hrms";
import { getDefaultRouteForUser } from "../constants/permissions";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import OrganizationLogo from "../components/OrganizationLogo";
import { setStoredUser } from "../hooks/useAuth";
import { login, employeeLogin } from "../services/authService";
import { generateCorrelationId } from "../utils/tokenUtils";

const FEATURE_ITEMS = [
    "Centralized employee records",
    "Workforce planning and reporting",
    "Secure role-based administration"
];

export default function LoginPage() {
    const navigate = useNavigate();
    const {
        applicationName: configuredApplicationName,
        primaryDepartmentName,
        refresh
    } = useOrganizationSettings();
    const applicationName = configuredApplicationName || getApplicationName();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        workstation: localStorage.getItem("clientHost") || ""
    });
    const [loginMode, setLoginMode] = useState("staff");
    const isEmployeeLogin = loginMode === "employee";
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (event) => {
        setFormData((current) => ({
            ...current,
            [event.target.name]: event.target.value
        }));
        if (errorMessage) {
            setErrorMessage("");
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        setSubmitting(true);
        setErrorMessage("");

        try {
            const response = await (isEmployeeLogin ? employeeLogin : login)({
                username: formData.username,
                password: formData.password
            });

            localStorage.setItem("token", response.token);
            localStorage.setItem("sessionId", generateCorrelationId());

            if (formData.workstation?.trim()) {
                localStorage.setItem("clientHost", formData.workstation.trim());
            }

            const user = {
                username: response.username,
                role: response.role,
                permissions: response.permissions ?? []
            };

            setStoredUser(user);
            await refresh();
            navigate(getDefaultRouteForUser(user));
        } catch (error) {
            setErrorMessage(error.response?.status === 429
                ? "Too many sign-in attempts. Please try again in 15 minutes."
                : isEmployeeLogin
                    ? "The S/N number or NIC is incorrect. Please check your details and try again."
                    : "The username or password is incorrect. Please check your details and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            component="main"
            sx={{
                minHeight: "100dvh",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(430px, 0.9fr) 1.1fr" },
                backgroundColor: "background.default"
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    display: { xs: "none", lg: "flex" },
                    minHeight: "100dvh",
                    overflow: "hidden",
                    color: "common.white",
                    background: "linear-gradient(145deg, #0A1C32 0%, #123C5F 57%, #0C6B68 145%)",
                    p: { lg: 6, xl: 9 },
                    flexDirection: "column",
                    justifyContent: "space-between"
                }}
            >
                <Box
                    aria-hidden="true"
                    sx={{
                        position: "absolute",
                        width: 420,
                        height: 420,
                        right: -150,
                        top: -130,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.16)",
                        boxShadow: "0 0 0 70px rgba(255,255,255,0.025), 0 0 0 140px rgba(255,255,255,0.018)"
                    }}
                />
                <Stack direction="row" spacing={1.5} sx={{alignItems: "center",  position: "relative" }}>
                    <OrganizationLogo size={46} inverted alt={`${applicationName} logo`} />
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {applicationName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.68)" }}>
                            Human Resources Management
                        </Typography>
                    </Box>
                </Stack>

                <Box sx={{ position: "relative", maxWidth: 570, my: 8 }}>
                    <Typography
                        component="p"
                        sx={{
                            mb: 2,
                            color: "#83E0D0",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase"
                        }}
                    >
                        People • Service • Progress
                    </Typography>
                    <Typography
                        component="h1"
                        sx={{
                            maxWidth: 540,
                            fontSize: { lg: "2.65rem", xl: "3.35rem" },
                            fontWeight: 780,
                            lineHeight: 1.08,
                            letterSpacing: "-0.045em"
                        }}
                    >
                        A clearer view of your entire workforce.
                    </Typography>
                    <Typography
                        sx={{
                            mt: 2.5,
                            maxWidth: 520,
                            color: "rgba(255,255,255,0.70)",
                            fontSize: "1rem",
                            lineHeight: 1.7
                        }}
                    >
                        Manage staff records, career progress, cadre planning, and reports from one secure workspace.
                    </Typography>

                    <Stack spacing={1.5} sx={{ mt: 4 }}>
                        {FEATURE_ITEMS.map((item) => (
                            <Stack key={item} direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                                <CheckCircleOutlineRoundedIcon sx={{ color: "#83E0D0", fontSize: 20 }} />
                                <Typography sx={{ color: "rgba(255,255,255,0.82)", fontWeight: 550 }}>
                                    {item}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                <Typography variant="caption" sx={{ position: "relative", color: "rgba(255,255,255,0.55)" }}>
                    {primaryDepartmentName || "Authorized personnel only"}
                </Typography>
            </Box>

            <Box
                sx={{
                    minHeight: { xs: "100dvh", lg: "auto" },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 2, sm: 4, lg: 7 },
                    py: { xs: 3, sm: 6 }
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 460 }}>
                    <Stack
                        direction="row"
                        spacing={1.25}

                        sx={{alignItems: "center",  display: { xs: "flex", lg: "none" }, mb: 4 }}
                    >
                        <OrganizationLogo size={42} alt={`${applicationName} logo`} />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                {applicationName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Human Resources Management
                            </Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ mb: 3 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                display: { xs: "none", lg: "grid" },
                                placeItems: "center",
                                borderRadius: 2.5,
                                color: "primary.main",
                                bgcolor: "primary.50",
                                mb: 2.5
                            }}
                        >
                            <LockOutlinedIcon />
                        </Box>
                        <Typography component="h2" variant="h4">
                            Welcome back
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            Sign in with your authorized account to continue.
                        </Typography>
                    </Box>

                    <Paper
                        component="form"
                        onSubmit={handleLogin}
                        sx={{
                            p: { xs: 2.25, sm: 3.5 },
                            border: "1px solid",
                            borderColor: "divider",
                            boxShadow: { xs: 1, sm: 3 }
                        }}
                    >
                        <Stack spacing={2.25}>
                            <Tabs value={loginMode} variant="fullWidth" aria-label="Sign-in type"
                                onChange={(_, mode) => {
                                    setLoginMode(mode);
                                    setFormData((current) => ({ ...current, username: "", password: "" }));
                                    setErrorMessage("");
                                }}>
                                <Tab value="staff" label="Staff sign in" disabled={submitting} />
                                <Tab value="employee" label="Employee sign in" disabled={submitting} />
                            </Tabs>
                            {isEmployeeLogin && (
                                <Typography variant="body2" color="text.secondary">
                                    Use your S/N number and NIC to view your own profile and career history.
                                    This access is read-only.
                                </Typography>
                            )}
                            {errorMessage && (
                                <Alert severity="error" onClose={() => setErrorMessage("")}>
                                    {errorMessage}
                                </Alert>
                            )}

                            <TextField
                                label={isEmployeeLogin ? "S/N number" : "Username"}
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                autoComplete="username"
                                autoFocus
                                required
                                fullWidth
                            />

                            <TextField
                                label={isEmployeeLogin ? "NIC" : "Password"}
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                required
                                fullWidth
                            />

                            {!isEmployeeLogin && <TextField
                                label="Workstation name"
                                name="workstation"
                                value={formData.workstation}
                                onChange={handleChange}
                                autoComplete="off"
                                helperText="Optional identifier used in audit records"
                                fullWidth
                            />}

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={submitting}
                                startIcon={submitting ? <CircularProgress size={17} color="inherit" /> : null}
                                fullWidth
                                sx={{ mt: 0.5 }}
                            >
                                {submitting ? "Signing in…" : "Sign in"}
                            </Button>
                        </Stack>
                    </Paper>

                    <Stack direction="row" spacing={0.75} sx={{alignItems: "center", justifyContent: "center",  mt: 3 }}>
                        <SecurityRoundedIcon sx={{ color: "text.secondary", fontSize: 16 }} />
                        <Typography variant="caption" color="text.secondary">
                            Secure access for authorized personnel
                        </Typography>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}
