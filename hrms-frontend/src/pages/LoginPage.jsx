import {
    Button,
    Container,
    TextField,
    Typography,
    Box
} from "@mui/material";

import { useState } from "react";
import { login } from "../services/authService";
import { setStoredUser } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { generateCorrelationId } from "../utils/tokenUtils";

export default function LoginPage() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        workstation: localStorage.getItem("clientHost") || ""
    });

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleLogin = async (e) => {

        e.preventDefault();

        try {

            const response = await login({
                username: formData.username,
                password: formData.password
            });

            localStorage.setItem("token", response.token);
            localStorage.setItem("sessionId", generateCorrelationId());

            if (formData.workstation?.trim()) {
                localStorage.setItem("clientHost", formData.workstation.trim());
            }

            setStoredUser({
                username: response.username,
                role: response.role
            });

            navigate("/dashboard");

        } catch (error) {

            alert("Invalid credentials");
        }
    };

    return (
        <Container maxWidth="sm">

            <Box
                component="form"
                onSubmit={handleLogin}
                sx={{
                    mt: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2
                }}
            >

                <Typography variant="h4">
                    NWP HRMS Login
                </Typography>

                <TextField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />

                <TextField
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <TextField
                    label="Workstation name (optional)"
                    name="workstation"
                    value={formData.workstation}
                    onChange={handleChange}
                    helperText="Optional LAN workstation identifier sent with each request"
                />

                <Button
                    type="submit"
                    variant="contained"
                >
                    Login
                </Button>

            </Box>

        </Container>
    );
}
