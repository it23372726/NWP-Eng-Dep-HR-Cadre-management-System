import { Box, Paper, TableContainer, Typography } from "@mui/material";

export default function ResponsiveTableContainer({
    children,
    component = Paper,
    showScrollHint = true,
    tableMinWidth,
    wrapperSx,
    sx,
    ...props
}) {
    return (
        <Box sx={wrapperSx}>
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
                        bgcolor: "grey.100",
                        "@media print": {
                            display: "none"
                        }
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
                                  minWidth: tableMinWidth,
                                  "@media print": {
                                      minWidth: 0
                                  }
                              }
                          }
                        : {}),
                    "@media print": {
                        overflow: "visible",
                        maxHeight: "none"
                    },
                    ...sx
                }}
                {...props}
            >
                {children}
            </TableContainer>
        </Box>
    );
}
