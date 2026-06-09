import {
    Button,
    Container,
    TextField,
    Typography,
    Box
} from "@mui/material";

import { useState } from "react";
import { login } from "../services/authService";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        password: ""
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

            const response = await login(formData);

            localStorage.setItem(
                "token",
                response.token
            );

            navigate("/dashboard");

        } catch (error) {

            alert("Invalid credentials");
        }
    };

    return (
        <Container maxWidth="sm">

            <Box
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
                    onChange={handleChange}
                />

                <TextField
                    label="Password"
                    type="password"
                    name="password"
                    onChange={handleChange}
                />

                <Button
                    variant="contained"
                    onClick={handleLogin}
                >
                    Login
                </Button>

            </Box>

        </Container>
    );
}