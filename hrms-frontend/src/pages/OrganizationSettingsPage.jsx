import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    ApartmentRounded as ApartmentIcon,
    BadgeRounded as BadgeIcon,
    DeleteOutlineRounded as DeleteIcon,
    DomainVerificationRounded as DomainVerificationIcon,
    InfoOutlined as InfoIcon,
    LocationOnRounded as LocationIcon,
    SaveRounded as SaveIcon
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import FormSection from "../components/FormSection";
import { getApiErrorMessage } from "../constants/hrms";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import { updateOrganizationSettings } from "../services/organizationSettingsService";
import { createFormFieldProps } from "../utils/formLayout";

const emptyForm = {
    primaryDepartmentName: "",
    provincialCouncilName: "",
    departmentShortName: "",
    applicationName: "",
    councilLabel: "",
    districts: []
};

function SectionHeading({ icon, title, description, action }) {
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
                mb: 2.5,
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between"
            }}
        >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2.5,
                        display: "grid",
                        placeItems: "center",
                        color: "primary.main",
                        bgcolor: "primary.50",
                        flexShrink: 0
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </Box>
            </Stack>
            {action}
        </Stack>
    );
}

function DistrictsEditor({ items, onAdd, onUpdate, onRemove, fieldProps }) {
    return (
        <Stack spacing={1.25}>
            {items.length === 0 && (
                <Alert severity="warning">
                    Add at least one district before creating offices.
                </Alert>
            )}

            {items.map((district, index) => (
                <Paper
                    key={`district-${index}`}
                    variant="outlined"
                    sx={{
                        p: 1.25,
                        bgcolor: "grey.50",
                        borderRadius: 2.5
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                    >
                        <Box
                            aria-hidden="true"
                            sx={{
                                width: 30,
                                height: 30,
                                borderRadius: 2,
                                display: { xs: "none", sm: "grid" },
                                placeItems: "center",
                                bgcolor: "background.paper",
                                color: "text.secondary",
                                border: "1px solid",
                                borderColor: "divider",
                                fontSize: "0.75rem",
                                fontWeight: 750,
                                flexShrink: 0
                            }}
                        >
                            {index + 1}
                        </Box>
                        <TextField
                            {...fieldProps}
                            label={`District ${index + 1}`}
                            value={district}
                            onChange={(event) => onUpdate(index, event.target.value)}
                            placeholder="Enter district name"
                            sx={{ flex: 1 }}
                        />
                        <IconButton
                            color="error"
                            onClick={() => onRemove(index)}
                            aria-label={`Remove district ${index + 1}`}
                            disabled={items.length <= 1}
                            sx={{
                                width: 40,
                                height: 40,
                                flexShrink: 0,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider"
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Paper>
            ))}

            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onAdd}
                sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
            >
                Add another district
            </Button>
        </Stack>
    );
}

export default function OrganizationSettingsPage() {
    const { settings, applySettings, refresh } = useOrganizationSettings();
    const [form, setForm] = useState(emptyForm);
    const [loadedPrimary, setLoadedPrimary] = useState("");
    const [saving, setSaving] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameMode, setRenameMode] = useState("MIGRATE_EXISTING");

    useEffect(() => {
        setForm({
            primaryDepartmentName: settings.primaryDepartmentName || "",
            provincialCouncilName: settings.provincialCouncilName || "",
            departmentShortName: settings.departmentShortName || "",
            applicationName: settings.applicationName || "",
            councilLabel: settings.councilLabel || "",
            districts: [...(settings.districts || [])]
        });
        setLoadedPrimary(settings.primaryDepartmentName || "");
    }, [settings]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const { fieldProps } = createFormFieldProps(handleChange);

    const addDistrict = () => {
        setForm((current) => ({
            ...current,
            districts: [...current.districts, ""]
        }));
    };

    const updateDistrict = (index, value) => {
        setForm((current) => ({
            ...current,
            districts: current.districts.map((item, itemIndex) =>
                itemIndex === index ? value : item
            )
        }));
    };

    const removeDistrict = (index) => {
        setForm((current) => ({
            ...current,
            districts: current.districts.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const cleanDistricts = (districts) =>
        districts.map((district) => district.trim()).filter(Boolean);

    const buildPayload = (departmentRenameMode = null) => ({
        primaryDepartmentName: form.primaryDepartmentName.trim(),
        provincialCouncilName: form.provincialCouncilName.trim(),
        departmentShortName: form.departmentShortName.trim(),
        applicationName: form.applicationName.trim(),
        councilLabel: form.councilLabel.trim(),
        districts: cleanDistricts(form.districts),
        ...(departmentRenameMode ? { departmentRenameMode } : {})
    });

    const primaryChanged =
        form.primaryDepartmentName.trim().toLowerCase()
        !== (loadedPrimary || "").trim().toLowerCase();

    const canSave = Boolean(
        form.primaryDepartmentName.trim()
        && form.provincialCouncilName.trim()
        && form.departmentShortName.trim()
        && form.applicationName.trim()
        && form.councilLabel.trim()
        && cleanDistricts(form.districts).length > 0
    );

    const save = async (departmentRenameMode = null) => {
        if (!canSave) {
            toast.error("Fill in all required fields and at least one district");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateOrganizationSettings(
                buildPayload(departmentRenameMode)
            );
            applySettings(updated);
            setLoadedPrimary(updated.primaryDepartmentName);
            setRenameDialogOpen(false);
            toast.success("Organization settings saved");
            await refresh();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveClick = () => {
        if (primaryChanged) {
            setRenameMode("MIGRATE_EXISTING");
            setRenameDialogOpen(true);
            return;
        }
        save();
    };

    const districtCount = cleanDistricts(form.districts).length;

    return (
        <Container maxWidth="lg">
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2.25, sm: 3 },
                    mb: 2.5,
                    overflow: "hidden",
                    position: "relative",
                    background: (theme) =>
                        `linear-gradient(125deg, ${theme.palette.background.paper} 30%, ${theme.palette.primary[50]} 100%)`,
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        right: -70,
                        top: -100,
                        bgcolor: "primary.100",
                        opacity: 0.45
                    }
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", sm: "center" }
                    }}
                >
                    <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                borderRadius: 3,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                boxShadow: 2,
                                flexShrink: 0
                            }}
                        >
                            <ApartmentIcon />
                        </Box>
                        <Box>
                            <Typography variant="h5">Organization Settings</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Manage the identity, labels, and service districts used across the system.
                            </Typography>
                        </Box>
                    </Stack>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveClick}
                        disabled={!canSave || saving}
                        sx={{ flexShrink: 0 }}
                    >
                        {saving ? "Saving…" : "Save settings"}
                    </Button>
                </Stack>
            </Paper>

            <Alert
                severity="info"
                icon={<InfoIcon />}
                sx={{ mb: 2.5, alignItems: "center" }}
            >
                Renaming the primary department can also update existing employee and action records. You will be asked to confirm how those records should be handled before saving.
            </Alert>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(320px, 0.65fr)" },
                    gap: 2.5,
                    alignItems: "start"
                }}
            >
                <Box>
                    <FormSection>
                        <SectionHeading
                            icon={<BadgeIcon fontSize="small" />}
                            title="Organization identity"
                            description="Core names shown in navigation, forms, dashboards, and reports."
                        />
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                gap: 2
                            }}
                        >
                            <TextField
                                {...fieldProps}
                                label="Primary department name"
                                name="primaryDepartmentName"
                                value={form.primaryDepartmentName}
                                required
                                helperText="Used for dashboard and report scoping"
                                sx={{ gridColumn: { sm: "1 / -1" } }}
                            />
                            <TextField
                                {...fieldProps}
                                label="Department short name"
                                name="departmentShortName"
                                value={form.departmentShortName}
                                required
                                placeholder="e.g. ENG"
                            />
                            <TextField
                                {...fieldProps}
                                label="Application name"
                                name="applicationName"
                                value={form.applicationName}
                                required
                            />
                            <TextField
                                {...fieldProps}
                                label="Provincial council name"
                                name="provincialCouncilName"
                                value={form.provincialCouncilName}
                                required
                                sx={{ gridColumn: { sm: "1 / -1" } }}
                            />
                            <TextField
                                {...fieldProps}
                                label="Council label"
                                name="councilLabel"
                                value={form.councilLabel}
                                required
                                helperText="Used for council date field labels"
                                sx={{ gridColumn: { sm: "1 / -1" } }}
                            />
                        </Box>
                    </FormSection>

                    <FormSection>
                        <SectionHeading
                            icon={<LocationIcon fontSize="small" />}
                            title="Service districts"
                            description="District changes are reflected in offices, employees, and related records."
                            action={
                                <Chip
                                    label={`${districtCount} ${districtCount === 1 ? "district" : "districts"}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            }
                        />
                        <DistrictsEditor
                            items={form.districts}
                            onAdd={addDistrict}
                            onUpdate={updateDistrict}
                            onRemove={removeDistrict}
                            fieldProps={fieldProps}
                        />
                    </FormSection>
                </Box>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2.5,
                        position: { lg: "sticky" },
                        top: { lg: 88 }
                    }}
                >
                    <SectionHeading
                        icon={<DomainVerificationIcon fontSize="small" />}
                        title="Brand preview"
                        description="A quick preview of how the current names work together."
                    />
                    <Box
                        sx={{
                            p: 2.5,
                            mb: 2,
                            borderRadius: 3,
                            bgcolor: "primary.900",
                            color: "primary.contrastText",
                            background: (theme) =>
                                `linear-gradient(145deg, ${theme.palette.primary[900]}, ${theme.palette.primary[700]})`
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ color: "primary.100", textTransform: "uppercase", letterSpacing: "0.08em" }}
                        >
                            {form.provincialCouncilName || "Provincial council"}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.75, color: "inherit" }}>
                            {form.primaryDepartmentName || "Primary department"}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, color: "primary.100" }}>
                            {form.applicationName || "Application name"}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
                            <Chip
                                label={form.departmentShortName || "Short name"}
                                size="small"
                                sx={{ bgcolor: "common.white", color: "primary.900" }}
                            />
                            <Typography variant="caption" sx={{ color: "primary.100" }}>
                                {districtCount} service {districtCount === 1 ? "district" : "districts"}
                            </Typography>
                        </Stack>
                    </Box>
                    <Stack spacing={1.25}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Council field label
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {form.councilLabel || "Council label"}
                            </Typography>
                        </Box>
                        <Box sx={{ pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
                            <Typography variant="caption" color="text.secondary">
                                Primary department
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {form.primaryDepartmentName || "Not configured"}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </Box>

            <Paper
                variant="outlined"
                sx={{
                    mt: 0.5,
                    p: 2,
                    boxShadow: 1,
                    bgcolor: (theme) => theme.palette.background.paper
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between"
                    }}
                >
                    <Box>
                        <Typography variant="subtitle2">Ready to apply your settings?</Typography>
                        <Typography variant="caption" color="text.secondary">
                            All required fields and at least one district must be completed.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveClick}
                        disabled={!canSave || saving}
                    >
                        {saving ? "Saving…" : "Save settings"}
                    </Button>
                </Stack>
            </Paper>

            <Dialog
                open={renameDialogOpen}
                onClose={() => !saving && setRenameDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2.5,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "warning.light",
                                color: "warning.dark"
                            }}
                        >
                            <ApartmentIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="h6">Primary department renamed</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Choose how existing records should be handled.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box
                        sx={{
                            p: 1.75,
                            mb: 2,
                            borderRadius: 2.5,
                            bgcolor: "grey.50",
                            border: "1px solid",
                            borderColor: "divider"
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">Department name</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5, alignItems: { sm: "center" } }}>
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>{loadedPrimary}</Typography>
                            <Typography variant="caption" color="text.secondary">to</Typography>
                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 750 }}>
                                {form.primaryDepartmentName.trim()}
                            </Typography>
                        </Stack>
                    </Box>
                    <FormControl fullWidth>
                        <RadioGroup
                            value={renameMode}
                            onChange={(event) => setRenameMode(event.target.value)}
                            sx={{ gap: 1 }}
                        >
                            <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <FormControlLabel
                                    value="MIGRATE_EXISTING"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Update existing records</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Move all employee and action records to the new department name.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ m: 0, alignItems: "flex-start" }}
                                />
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <FormControlLabel
                                    value="KEEP_EXISTING"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Keep existing records unchanged</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Change only the setting and retain the old name on existing records.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ m: 0, alignItems: "flex-start" }}
                                />
                            </Paper>
                        </RadioGroup>
                    </FormControl>
                    {renameMode === "KEEP_EXISTING" && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Employees stored under the old name will move to Other Departments and will not count in primary dashboard totals or reports.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setRenameDialogOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => save(renameMode)}
                        disabled={saving}
                    >
                        {saving ? "Saving…" : "Confirm and save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
