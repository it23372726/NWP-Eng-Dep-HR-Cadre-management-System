import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import {
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography
} from "@mui/material";

import DateInput from "../DateInput";
import FormSection from "../FormSection";
import {
    CHILD_RELATIONSHIP_OPTIONS,
    emptyChildForm,
    isMarriedStatus
} from "../../utils/employeeDependentForm";
import { canShowDependentDetails } from "../../constants/hrms";

function ChildEntry({
    child,
    index,
    canRemove,
    onChange,
    onRemove
}) {
    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        onChange(index, { ...child, [name]: value });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Child {index + 1}
                </Typography>
                {canRemove && (
                    <IconButton
                        size="small"
                        color="error"
                        aria-label={`Remove child ${index + 1}`}
                        onClick={() => onRemove(index)}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}
            </Stack>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        label="NIC"
                        name="nic"
                        value={child.nic}
                        onChange={handleFieldChange}
                        helperText="Optional if not yet issued"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        required
                        label="Birth Certificate No."
                        name="birthCertificateNo"
                        value={child.birthCertificateNo}
                        onChange={handleFieldChange}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        required
                        label="Child Name"
                        name="fullName"
                        value={child.fullName}
                        onChange={handleFieldChange}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <DateInput
                        fullWidth
                        required
                        label="Date of Birth"
                        name="dateOfBirth"
                        value={child.dateOfBirth}
                        onChange={handleFieldChange}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        required
                        select
                        label="Relationship"
                        name="relationship"
                        value={child.relationship}
                        onChange={handleFieldChange}
                    >
                        {CHILD_RELATIONSHIP_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>
        </Paper>
    );
}

export default function EmployeeDependentDetailsSection({
    formData,
    onSpouseChange,
    onChildrenChange
}) {
    if (!canShowDependentDetails(formData) || !isMarriedStatus(formData.maritalStatus)) {
        return null;
    }

    const spouse = formData.spouse ?? { nic: "", fullName: "", dateOfBirth: "" };
    const children = formData.children ?? [];

    const handleSpouseFieldChange = (event) => {
        const { name, value } = event.target;
        onSpouseChange({
            ...spouse,
            [name]: value
        });
    };

    const handleChildChange = (index, nextChild) => {
        const nextChildren = children.map((child, childIndex) =>
            childIndex === index ? nextChild : child
        );
        onChildrenChange(nextChildren);
    };

    const handleAddChild = () => {
        onChildrenChange([...children, emptyChildForm()]);
    };

    const handleRemoveChild = (index) => {
        onChildrenChange(children.filter((_, childIndex) => childIndex !== index));
    };

    return (
        <FormSection
            title="Dependent details"
            description="Record spouse and children information for married employees. Spouse details are optional when unavailable."
        >
            <Stack spacing={3}>
                <Box>
                    <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ fontWeight: 700, letterSpacing: 0.8, display: "block" }}
                    >
                        Spouse
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                label="Spouse NIC"
                                name="nic"
                                value={spouse.nic}
                                onChange={handleSpouseFieldChange}
                                helperText="Optional"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                label="Spouse Name"
                                name="fullName"
                                value={spouse.fullName}
                                onChange={handleSpouseFieldChange}
                                helperText="Optional"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <DateInput
                                fullWidth
                                label="Spouse Date of Birth"
                                name="dateOfBirth"
                                value={spouse.dateOfBirth}
                                onChange={handleSpouseFieldChange}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                <Box>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                    >
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ fontWeight: 700, letterSpacing: 0.8 }}
                        >
                            Children
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={handleAddChild}
                        >
                            Add child
                        </Button>
                    </Stack>

                    <Stack spacing={2} sx={{ mt: 1.5 }}>
                        {children.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No children recorded. Use &quot;Add child&quot; to include dependent children.
                            </Typography>
                        ) : (
                            children.map((child, index) => (
                                <ChildEntry
                                    key={`child-${index}`}
                                    child={child}
                                    index={index}
                                    canRemove
                                    onChange={handleChildChange}
                                    onRemove={handleRemoveChild}
                                />
                            ))
                        )}
                    </Stack>
                </Box>
            </Stack>
        </FormSection>
    );
}
