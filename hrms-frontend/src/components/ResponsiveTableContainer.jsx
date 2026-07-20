import { Box, Paper, TableContainer, Typography } from "@mui/material";

export default function ResponsiveTableContainer({
    children,
    component = Paper,
    showScrollHint = true,
    tableMinWidth,
    sx,
    ...props
}) {
    return (
        <Box>
            {showScrollHint && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: { xs: "inline-flex", md: "none" },
                        mb: 1,
                        alignItems: "center",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: "grey.100"
                    }}
                >
                    Swipe to see more columns
                </Typography>
            )}
            <TableContainer
                component={component}
                sx={{
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    maxWidth: "100%",
                    ...(tableMinWidth
                        ? {
                              "& table": {
                                  minWidth: tableMinWidth
                              }
                          }
                        : {}),
                    ...sx
                }}
                {...props}
            >
                {children}
            </TableContainer>
        </Box>
    );
}
