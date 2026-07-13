import {
    Alert,
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon
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

function DistrictsEditor({
    items,
    onAdd,
    onUpdate,
    onRemove,
    fieldProps
}) {
    return (
        <Stack spacing={1.5}>
            {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No districts configured. Add at least one district before creating offices.
                </Typography>
            )}
            {items.map((district, index) => (
                <Stack
                    key={`district-${index}`}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                >
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
                        aria-label="Remove district"
                        sx={{ mt: 0.5 }}
                        disabled={items.length <= 1}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Stack>
            ))}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={onAdd}
                >
                    Add District
                </Button>
            </Stack>
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

    const canSave =
        form.primaryDepartmentName.trim()
        && form.provincialCouncilName.trim()
        && form.departmentShortName.trim()
        && form.applicationName.trim()
        && form.councilLabel.trim()
        && cleanDistricts(form.districts).length > 0;

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

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                    Organization Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configure the primary department, branding labels, and districts
                    used across employees, reports, and the dashboard.
                </Typography>
            </Stack>

            <Alert severity="info" sx={{ mb: 3 }}>
                Changing the primary department name affects which employees appear
                on the home department tab, dashboard, and reports. When you rename
                it, you can choose whether to update existing records.
            </Alert>

            <FormSection
                title="Organization identity"
                description="These labels appear in forms, navigation, and report headers."
            >
                <Stack spacing={2}>
                    <TextField
                        {...fieldProps}
                        label="Primary department name"
                        name="primaryDepartmentName"
                        value={form.primaryDepartmentName}
                        required
                        helperText="Home department used for dashboard and report scoping"
                    />
                    <TextField
                        {...fieldProps}
                        label="Department short name"
                        name="departmentShortName"
                        value={form.departmentShortName}
                        required
                    />
                    <TextField
                        {...fieldProps}
                        label="Provincial council name"
                        name="provincialCouncilName"
                        value={form.provincialCouncilName}
                        required
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
                        label="Council label"
                        name="councilLabel"
                        value={form.councilLabel}
                        required
                        helperText="Used for council date field labels"
                    />
                </Stack>
            </FormSection>

            <FormSection
                title="Districts"
                description="Add, rename, or remove districts. Editing a district name updates offices, employees, and related records. Removing a district that is still in use is blocked."
            >
                <DistrictsEditor
                    items={form.districts}
                    onAdd={addDistrict}
                    onUpdate={updateDistrict}
                    onRemove={removeDistrict}
                    fieldProps={fieldProps}
                />
            </FormSection>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveClick}
                    disabled={!canSave || saving}
                >
                    {saving ? "Saving…" : "Save Settings"}
                </Button>
            </Box>

            <Dialog
                open={renameDialogOpen}
                onClose={() => !saving && setRenameDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Primary department renamed</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        You changed the primary department from{" "}
                        <strong>{loadedPrimary}</strong> to{" "}
                        <strong>{form.primaryDepartmentName.trim()}</strong>.
                        How should existing employee and action records be handled?
                    </Typography>
                    <FormControl>
                        <RadioGroup
                            value={renameMode}
                            onChange={(event) => setRenameMode(event.target.value)}
                        >
                            <FormControlLabel
                                value="MIGRATE_EXISTING"
                                control={<Radio />}
                                label="Update all existing employee and action records to the new name"
                            />
                            <FormControlLabel
                                value="KEEP_EXISTING"
                                control={<Radio />}
                                label="Only change the setting; leave existing records unchanged"
                            />
                        </RadioGroup>
                    </FormControl>
                    {renameMode === "KEEP_EXISTING" && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Employees still stored under the old department name will
                            appear under Other Departments and will no longer count in
                            the primary dashboard and reports.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRenameDialogOpen(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => save(renameMode)}
                        disabled={saving}
                    >
                        {saving ? "Saving…" : "Confirm & Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
