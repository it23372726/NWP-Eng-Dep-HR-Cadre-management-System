import { useMemo, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Tooltip as MuiTooltip
} from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    BAR_CHART_FULL_ROW_HEIGHT,
    BAR_CHART_PREVIEW_HEIGHT,
    BAR_CHART_PREVIEW_ROW_HEIGHT,
    BAR_CHART_PRESETS,
    CHART_HEIGHT,
    buildChartColorMap
} from "../constants/dashboardTheme";

function truncateLabel(label, maxLength) {
    if (!label || label.length <= maxLength) {
        return label;
    }
    return `${label.slice(0, maxLength)}…`;
}

function VerticalBarChart({
    data,
    chartKey,
    variant,
    colorMap,
    previewBarSize,
    fullBarSize,
    previewRowHeight,
    fullRowHeight,
    previewCategoryGap,
    fullCategoryGap,
    previewLabelMaxLength,
    onBarClick
}) {
    const isPreview = variant === "preview";
    const rowHeight = isPreview ? previewRowHeight : fullRowHeight;
    const barSize = isPreview ? previewBarSize : fullBarSize;
    const categoryGap = isPreview ? previewCategoryGap : fullCategoryGap;
    const chartHeight = Math.max(
        isPreview ? BAR_CHART_PREVIEW_HEIGHT : CHART_HEIGHT,
        data.length * rowHeight
    );
    const yAxisWidth = isPreview ? 104 : 200;

    return (
        <ResponsiveContainer
            width="100%"
            height={chartHeight}
            initialDimension={{ width: 500, height: chartHeight }}
        >
            <BarChart
                data={data}
                layout="vertical"
                margin={{
                    top: 4,
                    right: isPreview ? 16 : 24,
                    left: isPreview ? 4 : 8,
                    bottom: 4
                }}
                barCategoryGap={categoryGap}
                barGap={2}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: isPreview ? 10 : 12 }}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={yAxisWidth}
                    tick={{
                        fontSize: isPreview ? 10 : 12,
                        fill: "#64748B"
                    }}
                    tickFormatter={isPreview
                        ? (value) => truncateLabel(value, previewLabelMaxLength)
                        : undefined}
                />
                <Tooltip
                    formatter={(value) => [`${value} employees`, "Count"]}
                    labelFormatter={(label) => label}
                />
                <Bar
                    dataKey="count"
                    barSize={barSize}
                    radius={[0, 4, 4, 0]}
                    cursor={onBarClick ? "pointer" : "default"}
                    onClick={onBarClick}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`${chartKey}-${entry.name}-${variant}-${index}`}
                            fill={colorMap.get(entry.name)}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export default function ExpandableVerticalBarChart({
    data,
    chartKey,
    preset = "designation",
    dialogTitle,
    contextLabel,
    helperText,
    onBarClick
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const config = BAR_CHART_PRESETS[preset] || BAR_CHART_PRESETS.designation;
    const colorMap = useMemo(
        () => buildChartColorMap(data.map((entry) => entry.name)),
        [data]
    );
    const itemLabel = config.itemLabel;
    const previewRowHeight = config.previewRowHeight ?? BAR_CHART_PREVIEW_ROW_HEIGHT;
    const fullRowHeight = config.fullRowHeight ?? BAR_CHART_FULL_ROW_HEIGHT;
    const innerHeight = Math.max(
        BAR_CHART_PREVIEW_HEIGHT,
        data.length * previewRowHeight
    );
    const hasOverflow = data.length * previewRowHeight > BAR_CHART_PREVIEW_HEIGHT;
    const dialogInnerHeight = Math.max(
        CHART_HEIGHT,
        data.length * fullRowHeight
    );

    const chartProps = {
        previewBarSize: config.previewBarSize,
        fullBarSize: config.fullBarSize,
        previewRowHeight,
        fullRowHeight,
        previewCategoryGap: config.previewCategoryGap,
        fullCategoryGap: config.fullCategoryGap,
        previewLabelMaxLength: config.previewLabelMaxLength
    };

    const handleExpand = () => setDialogOpen(true);
    const handleClose = () => setDialogOpen(false);

    const handleFullBarClick = (entry) => {
        if (!entry?.name) {
            return;
        }
        setDialogOpen(false);
        onBarClick?.(entry);
    };

    const countLabel = `${data.length} ${itemLabel}${data.length !== 1 ? "s" : ""}`;
    const previewHint = contextLabel
        ? `Click chart to open full ${itemLabel} breakdown for ${contextLabel}`
        : `Click chart to open full ${itemLabel} breakdown`;

    return (
        <>
            <Stack spacing={1}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.4 }}
                >
                    {countLabel}
                    {hasOverflow ? " — scroll or expand to view all" : ""}
                </Typography>

                <Box sx={{ position: "relative" }}>
                    <MuiTooltip title="Expand chart">
                        <IconButton
                            size="small"
                            aria-label="Expand chart"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleExpand();
                            }}
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                zIndex: 2,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                                boxShadow: 1,
                                "&:hover": {
                                    bgcolor: "background.paper",
                                    borderColor: "primary.light"
                                }
                            }}
                        >
                            <OpenInFullIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </MuiTooltip>

                    <Box
                        role="button"
                        tabIndex={0}
                        onClick={handleExpand}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleExpand();
                            }
                        }}
                        sx={{
                            height: BAR_CHART_PREVIEW_HEIGHT,
                            overflowY: "auto",
                            overflowX: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1.5,
                            bgcolor: "background.default",
                            cursor: "pointer",
                            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                            "&:hover": {
                                borderColor: "primary.light",
                                boxShadow: 1
                            }
                        }}
                    >
                        <Box sx={{ height: innerHeight, minHeight: BAR_CHART_PREVIEW_HEIGHT }}>
                            <VerticalBarChart
                                data={data}
                                chartKey={chartKey}
                                variant="preview"
                                colorMap={colorMap}
                                onBarClick={handleExpand}
                                {...chartProps}
                            />
                        </Box>
                    </Box>
                </Box>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.4 }}
                >
                    {helperText || previewHint}
                </Typography>
            </Stack>

            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                scroll="paper"
            >
                <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
                    {dialogTitle}
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, fontWeight: 400 }}
                    >
                        {countLabel} — click a bar to view employees
                    </Typography>
                    <IconButton
                        aria-label="Close chart"
                        onClick={handleClose}
                        sx={{ position: "absolute", right: 12, top: 12 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box
                        sx={{
                            maxHeight: "70vh",
                            overflowY: "auto",
                            overflowX: "hidden"
                        }}
                    >
                        <Box sx={{ height: dialogInnerHeight, minWidth: 0 }}>
                            <VerticalBarChart
                                data={data}
                                chartKey={chartKey}
                                variant="full"
                                colorMap={colorMap}
                                onBarClick={handleFullBarClick}
                                {...chartProps}
                            />
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
