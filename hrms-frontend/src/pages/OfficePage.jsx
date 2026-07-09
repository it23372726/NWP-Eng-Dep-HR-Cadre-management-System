import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Container,
    Button,
    TextField,
    Stack,
    Box,
    IconButton,
    Tooltip,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    MenuItem
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import OfficeForm from "../components/OfficeForm";
import MobileDataCard, {
    DesktopTableWrapper,
    MobileDataCardList
} from "../components/MobileDataCard";
import { getApiErrorMessage } from "../constants/hrms";
import { useOrganizationSettings } from "../context/OrganizationSettingsContext";
import {
    createOffice,
    deleteOffice,
    getOffices,
    updateOffice
} from "../services/officeService";

const districtLabel = (district) =>
    district?.label ?? district ?? "—";

export default function OfficePage() {
    const { districts, primaryDepartmentName } = useOrganizationSettings();
    const [offices, setOffices] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [districtFilter, setDistrictFilter] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [officeToDelete, setOfficeToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadOffices();
    }, []);

    const loadOffices = async () => {
        try {
            const data = await getOffices();
            setOffices(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const filteredOffices = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        return offices.filter((office) => {
            const matchesDistrict = !districtFilter
                || districtLabel(office.district) === districtFilter;
            const matchesKeyword = !keyword
                || office.name?.toLowerCase().includes(keyword)
                || districtLabel(office.district).toLowerCase().includes(keyword);
            return matchesDistrict && matchesKeyword;
        });
    }, [offices, searchKeyword, districtFilter]);

    const handleCreate = async (data) => {
        try {
            await createOffice(data);
            toast.success("Office created");
            setOpen(false);
            loadOffices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {
        try {
            await updateOffice(selectedOffice.id, data);
            toast.success("Office updated");
            setOpen(false);
            setSelectedOffice(null);
            loadOffices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const confirmDelete = async () => {
        if (!officeToDelete) {
            return;
        }
        setDeleting(true);
        try {
            await deleteOffice(officeToDelete.id);
            toast.success("Office deleted");
            setDeleteDialogOpen(false);
            setOfficeToDelete(null);
            loadOffices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mb: 3, alignItems: { sm: "center" }, justifyContent: "space-between" }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Offices
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Manage {primaryDepartmentName} workplaces by district.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setSelectedOffice(null);
                        setOpen(true);
                    }}
                >
                    Add Office
                </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                <TextField
                    placeholder="Search offices..."
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    size="small"
                    sx={{ minWidth: 240 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: searchKeyword ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchKeyword("")}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }
                    }}
                />
                <TextField
                    select
                    label="District"
                    value={districtFilter}
                    onChange={(event) => setDistrictFilter(event.target.value)}
                    size="small"
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">All districts</MenuItem>
                    {districts.map((district) => (
                        <MenuItem key={district} value={district}>
                            {district}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>

            {filteredOffices.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        {offices.length === 0
                            ? "No offices registered yet. Add the first office to get started."
                            : "No offices match your search."}
                    </Typography>
                </Paper>
            ) : (
                <>
                <DesktopTableWrapper>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Office Name</TableCell>
                                <TableCell>District</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOffices.map((office) => (
                                <TableRow key={office.id} hover>
                                    <TableCell>{office.name}</TableCell>
                                    <TableCell>{districtLabel(office.district)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit">
                                            <IconButton
                                                onClick={() => {
                                                    setSelectedOffice(office);
                                                    setOpen(true);
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                color="error"
                                                onClick={() => {
                                                    setOfficeToDelete(office);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                </DesktopTableWrapper>

                <MobileDataCardList>
                    {filteredOffices.map((office) => (
                        <MobileDataCard
                            key={office.id}
                            title={office.name}
                            fields={[
                                {
                                    label: "District",
                                    value: districtLabel(office.district)
                                }
                            ]}
                            actions={
                                <>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            onClick={() => {
                                                setSelectedOffice(office);
                                                setOpen(true);
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            color="error"
                                            onClick={() => {
                                                setOfficeToDelete(office);
                                                setDeleteDialogOpen(true);
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            }
                        />
                    ))}
                </MobileDataCardList>
                </>
            )}

            <OfficeForm
                open={open}
                handleClose={() => {
                    setOpen(false);
                    setSelectedOffice(null);
                }}
                handleSubmit={selectedOffice ? handleUpdate : handleCreate}
                selectedOffice={selectedOffice}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Office</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Delete &quot;{officeToDelete?.name}&quot;? This cannot be undone if
                        no active employees are assigned to this office.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={confirmDelete}
                        disabled={deleting}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
