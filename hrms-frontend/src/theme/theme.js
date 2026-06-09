import { createTheme, alpha } from "@mui/material/styles";

const navy = {
    900: "#0B1F3A",
    800: "#0F2A4A",
    700: "#17365C"
};

const slate = {
    900: "#0F172A",
    800: "#1E293B",
    700: "#334155",
    600: "#475569",
    500: "#64748B",
    200: "#E2E8F0",
    100: "#F1F5F9",
    50: "#F8FAFC"
};

export const theme = createTheme({
    palette: {
        mode: "light",
        primary: { main: navy[800] },
        secondary: { main: slate[700] },
        background: {
            default: slate[50],
            paper: "#FFFFFF"
        },
        text: {
            primary: slate[900],
            secondary: slate[600]
        },
        divider: slate[200],
        success: { main: "#1B7A46" },
        warning: { main: "#B45309" },
        error: { main: "#B42318" }
    },
    typography: {
        fontFamily: [
            "Inter",
            "system-ui",
            "-apple-system",
            "Segoe UI",
            "Roboto",
            "Arial",
            "sans-serif"
        ].join(","),
        h4: { fontWeight: 750, letterSpacing: -0.2 },
        h5: { fontWeight: 740, letterSpacing: -0.15 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600 },
        body1: { fontSize: "0.95rem" },
        body2: { fontSize: "0.9rem" }
    },
    shape: { borderRadius: 12 },
    shadows: [
        "none",
        "0px 1px 2px rgba(15, 23, 42, 0.06)",
        "0px 2px 6px rgba(15, 23, 42, 0.08)",
        "0px 6px 18px rgba(15, 23, 42, 0.10)",
        ...Array.from({ length: 21 }, () => "none")
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: slate[50]
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    border: `1px solid ${slate[200]}`,
                    backgroundImage: "none"
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#FFFFFF",
                    color: slate[900],
                    borderBottom: `1px solid ${slate[200]}`
                }
            }
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    textTransform: "none",
                    fontWeight: 650
                }
            }
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: slate[100]
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    color: slate[800],
                    borderBottom: `1px solid ${slate[200]}`
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: "#FFFFFF",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: alpha(navy[800], 0.5)
                    }
                }
            }
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontWeight: 750
                }
            }
        }
    }
});

