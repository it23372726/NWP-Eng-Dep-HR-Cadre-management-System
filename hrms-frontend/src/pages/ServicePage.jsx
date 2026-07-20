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
    Alert
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getServices,
    createService,
    updateService,
    deleteService,
    searchServices
} from "../services/serviceService";
import ServiceForm from "../components/ServiceForm";
import GradeChips from "../components/GradeChips";
import MobileDataCard, {
    DesktopTableWrapper,
    MobileDataCardList
} from "../components/MobileDataCard";
import { getApiErrorMessage } from "../constants/hrms";

export default function ServicePage() {
    const [services, setServices] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadServices();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(async () => {
            if (!searchKeyword.trim()) {
                loadServices();
                return;
            }

            try {
                const data = await searchServices(searchKeyword);
                setServices(data);
            } catch {
                // Keep the current list when a background search is interrupted.
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchKeyword]);

    const loadServices = async () => {
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleCreate = async (data) => {
        try {
            await createService(data);
            toast.success("Service created");
            setOpen(false);
            loadServices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {
        try {
            await updateService(selectedService.id, data);
            toast.success("Service updated");
            setOpen(false);
            setSelectedService(null);
            loadServices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleDeleteClick = (service) => {
        setServiceToDelete(service);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast.success("Service deleted");
            setDeleteDialogOpen(false);
            setServiceToDelete(null);
            loadServices();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const openCreateDialog = () => {
        setSelectedService(null);
        setOpen(true);
    };

    const openEditDialog = (service) => {
        setSelectedService(service);
        setOpen(true);
    };

    const closeFormDialog = () => {
        setOpen(false);
        setSelectedService(null);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mb: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Services
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage government service classifications used to group
                            designations and employee records.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Service
                    </Button>
                </Stack>

                <TextField
                    label="Search services"
                    placeholder="Service code or description..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ maxWidth: 480 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchKeyword ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchKeyword("")}
                                        edge="end"
                                        aria-label="Clear search"
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }
                    }}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Showing {services.length} service{services.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {services.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary" gutterBottom>
                        {searchKeyword.trim()
                            ? "No services match your search"
                            : "No services configured yet"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {searchKeyword.trim()
                            ? "Try a different search term"
                            : "Create your first service to get started"}
                    </Typography>
                    {!searchKeyword.trim() && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                        >
                            Add Service
                        </Button>
                    )}
                </Paper>
            ) : (
                <>
                <DesktopTableWrapper>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Service Code</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Max Grades</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {services.map((service) => (
                                <TableRow
                                    key={service.id}
                                    hover
                                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {service.serviceCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {service.description}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <GradeChips grades={service.allowedGrades} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit service">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEditDialog(service)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete service">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(service)}
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
                    {services.map((service) => (
                        <MobileDataCard
                            key={service.id}
                            title={service.serviceCode}
                            subtitle={service.description}
                            fields={[
                                {
                                    label: "Max Grades",
                                    value: <GradeChips grades={service.allowedGrades} />
                                }
                            ]}
                            actions={
                                <>
                                    <Tooltip title="Edit service">
                                        <IconButton
                                            size="small"
                                            onClick={() => openEditDialog(service)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete service">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(service)}
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

            <ServiceForm
                open={open}
                handleClose={closeFormDialog}
                handleSubmit={selectedService ? handleUpdate : handleCreate}
                selectedService={selectedService}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Service</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Deleting a service may affect designations and employee records
                        linked to it.
                    </Alert>
                    <Typography>
                        Are you sure you want to delete service "
                        {serviceToDelete?.serviceCode}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                    >
                        {deleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
