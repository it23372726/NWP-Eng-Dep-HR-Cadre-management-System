import { alpha, createTheme } from "@mui/material/styles";

const ink = {
    950: "#0A1526",
    900: "#10233D",
    800: "#173451",
    700: "#244663"
};

const blue = {
    50: "#EEF6FF",
    100: "#D9EAFE",
    200: "#B9D8FB",
    500: "#2878C8",
    600: "#1767B0",
    700: "#11558F",
    800: "#124873",
    900: "#123C5F"
};

const teal = {
    50: "#ECFDF9",
    100: "#D1FAF1",
    500: "#14A58E",
    600: "#0C8877",
    700: "#0D6D61"
};

const slate = {
    950: "#0F172A",
    900: "#172033",
    800: "#263248",
    700: "#3B4960",
    600: "#536177",
    500: "#718096",
    300: "#CBD4E1",
    200: "#E1E7EF",
    100: "#EDF1F6",
    50: "#F6F8FB"
};

const subtleShadow = "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 35, 61, 0.05)";
const raisedShadow = "0 16px 40px rgba(15, 35, 61, 0.10), 0 2px 8px rgba(15, 35, 61, 0.05)";

export const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            ...blue,
            main: blue[700],
            dark: blue[900],
            light: blue[100],
            contrastText: "#FFFFFF"
        },
        secondary: {
            ...teal,
            main: teal[600],
            dark: teal[700],
            light: teal[100],
            contrastText: "#FFFFFF"
        },
        background: {
            default: slate[50],
            paper: "#FFFFFF"
        },
        text: {
            primary: slate[950],
            secondary: slate[600]
        },
        divider: slate[200],
        success: { main: "#148054", dark: "#0F6844", light: "#E9F8F0" },
        warning: { main: "#B8660B", dark: "#934D06", light: "#FFF6E5" },
        error: { main: "#C23832", dark: "#9E2925", light: "#FFF0EF" },
        info: { main: blue[600], dark: blue[800], light: blue[50] },
        grey: slate,
        action: {
            active: slate[600],
            hover: alpha(blue[700], 0.055),
            selected: alpha(blue[700], 0.10),
            disabledBackground: slate[100]
        }
    },
    typography: {
        fontFamily: [
            "Inter",
            "Aptos",
            "system-ui",
            "-apple-system",
            "BlinkMacSystemFont",
            "Segoe UI",
            "sans-serif"
        ].join(","),
        h4: {
            fontSize: "clamp(1.65rem, 3vw, 2.15rem)",
            fontWeight: 780,
            letterSpacing: "-0.035em",
            lineHeight: 1.15
        },
        h5: {
            fontSize: "clamp(1.3rem, 2vw, 1.55rem)",
            fontWeight: 760,
            letterSpacing: "-0.025em",
            lineHeight: 1.25
        },
        h6: {
            fontSize: "1.05rem",
            fontWeight: 720,
            letterSpacing: "-0.012em",
            lineHeight: 1.35
        },
        subtitle1: { fontWeight: 650 },
        subtitle2: { fontWeight: 650 },
        body1: { fontSize: "0.95rem", lineHeight: 1.6 },
        body2: { fontSize: "0.875rem", lineHeight: 1.55 },
        button: { fontWeight: 700, letterSpacing: "-0.01em" },
        caption: { fontSize: "0.76rem", lineHeight: 1.45 }
    },
    shape: { borderRadius: 14 },
    shadows: [
        "none",
        subtleShadow,
        "0 4px 12px rgba(15, 35, 61, 0.07)",
        raisedShadow,
        ...Array.from({ length: 21 }, () => raisedShadow)
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                "*, *::before, *::after": {
                    boxSizing: "border-box"
                },
                html: {
                    minWidth: 320,
                    backgroundColor: slate[50],
                    WebkitTextSizeAdjust: "100%"
                },
                body: {
                    minWidth: 320,
                    minHeight: "100vh",
                    margin: 0,
                    backgroundColor: slate[50],
                    backgroundImage: `radial-gradient(circle at 92% 0%, ${alpha(blue[100], 0.42)} 0, transparent 25rem)`
                },
                "#root": {
                    minHeight: "100vh"
                },
                "::selection": {
                    backgroundColor: alpha(blue[500], 0.22)
                },
                "@media print": {
                    body: { backgroundColor: "#FFFFFF", backgroundImage: "none" }
                }
            }
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    paddingLeft: 0,
                    paddingRight: 0,
                    "@media (min-width: 600px)": {
                        paddingLeft: 0,
                        paddingRight: 0
                    }
                }
            }
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    borderColor: slate[200]
                },
                rounded: {
                    borderRadius: 14
                }
            }
        },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    border: `1px solid ${slate[200]}`,
                    boxShadow: subtleShadow,
                    overflow: "hidden"
                }
            }
        },
        MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundColor: alpha("#FFFFFF", 0.94),
                    color: slate[950],
                    borderBottom: `1px solid ${alpha(slate[300], 0.78)}`,
                    backgroundImage: "none",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)"
                }
            }
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    minHeight: 40,
                    borderRadius: 10,
                    paddingInline: 16,
                    textTransform: "none",
                    transition: "transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                    "&:active": { transform: "translateY(1px)" }
                },
                contained: {
                    boxShadow: `0 6px 16px ${alpha(blue[700], 0.16)}`,
                    "&:hover": {
                        boxShadow: `0 8px 20px ${alpha(blue[700], 0.22)}`
                    }
                },
                sizeLarge: { minHeight: 48, paddingInline: 22 }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    transition: "background-color 160ms ease, color 160ms ease"
                }
            }
        },
        MuiTableContainer: {
            styleOverrides: {
                root: {
                    border: `1px solid ${slate[200]}`,
                    borderRadius: 14,
                    boxShadow: subtleShadow
                }
            }
        },
        MuiTableHead: {
            styleOverrides: {
                root: { backgroundColor: "#F3F6FA" }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: `1px solid ${slate[200]}`,
                    padding: "13px 16px"
                },
                head: {
                    color: slate[700],
                    fontSize: "0.75rem",
                    fontWeight: 760,
                    letterSpacing: "0.035em",
                    textTransform: "uppercase"
                }
            }
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    "&.MuiTableRow-hover:hover": {
                        backgroundColor: alpha(blue[50], 0.72)
                    }
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 11,
                    backgroundColor: "#FFFFFF",
                    transition: "box-shadow 160ms ease, background-color 160ms ease",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: alpha(blue[700], 0.52)
                    },
                    "&.Mui-focused": {
                        boxShadow: `0 0 0 3px ${alpha(blue[500], 0.12)}`
                    }
                },
                notchedOutline: {
                    borderColor: slate[300]
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: { color: slate[600] }
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: { marginLeft: 2, marginRight: 2, marginTop: 6 }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 650
                }
            }
        },
        MuiTabs: {
            styleOverrides: {
                root: { minHeight: 46 },
                indicator: { height: 3, borderRadius: "3px 3px 0 0" }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 46,
                    minWidth: "auto",
                    paddingInline: 16,
                    textTransform: "none",
                    fontWeight: 680
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 12, alignItems: "center" },
                standardSuccess: { backgroundColor: "#EEF9F3" },
                standardWarning: { backgroundColor: "#FFF8EA" },
                standardError: { backgroundColor: "#FFF2F1" },
                standardInfo: { backgroundColor: blue[50] }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    width: "calc(100% - 32px)",
                    maxHeight: "calc(100% - 32px)",
                    margin: 16,
                    borderRadius: 18,
                    border: `1px solid ${slate[200]}`,
                    boxShadow: "0 24px 70px rgba(10, 21, 38, 0.20)"
                }
            }
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    padding: "20px 24px 14px",
                    fontWeight: 760,
                    letterSpacing: "-0.02em"
                }
            }
        },
        MuiDialogContent: {
            styleOverrides: {
                root: { paddingInline: 24 }
            }
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    gap: 8,
                    padding: "16px 24px 20px",
                    flexWrap: "wrap"
                }
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius: 8,
                    backgroundColor: ink[900],
                    fontSize: "0.75rem"
                }
            }
        },
        MuiSkeleton: {
            defaultProps: { animation: "wave" },
            styleOverrides: {
                root: { backgroundColor: slate[100] }
            }
        }
    }
});
