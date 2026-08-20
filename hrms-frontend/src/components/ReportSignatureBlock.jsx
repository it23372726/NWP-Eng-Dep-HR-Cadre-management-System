import { Box, Typography } from "@mui/material";

export default function ReportSignatureBlock() {
    return (
        <Box
            className="report-signature-block"
            sx={{
                mt: 4,
                display: "grid",
                gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                columnGap: 2,
                rowGap: 3,
                pageBreakInside: "avoid"
            }}
        >
            <Box sx={{ gridColumn: "1 / span 3" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    Prepared By:
                </Typography>
                <Box sx={{ height: 28 }} />
            </Box>
            <Box sx={{ gridColumn: "6 / span 3" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    Checked By:
                </Typography>
                <Box sx={{ height: 28 }} />
            </Box>
        </Box>
    );
}
