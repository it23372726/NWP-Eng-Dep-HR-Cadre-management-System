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
    Chip
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

import {
    getCadres,
    createCadre,
    updateCadre,
    deleteCadre
} from "../services/cadreService";
import CadreForm from "../components/CadreForm";
import { getApiErrorMessage } from "../constants/hrms";

function matchesSearch(cadre, keyword) {
    const term = keyword.trim().toLowerCase();
    if (!term) return true;

    const designationName = cadre.designation?.designationName?.toLowerCase() ?? "";
    const serviceCode = cadre.designation?.service?.serviceCode?.toLowerCase() ?? "";
    const serviceDesc = cadre.designation?.service?.description?.toLowerCase() ?? "";
    const approvedCount = String(cadre.approvedCount ?? "");

    return (
        designationName.includes(term)
        || serviceCode.includes(term)
        || serviceDesc.includes(term)
        || approvedCount.includes(term)
    );
}

export default function CadrePage() {
    const [cadres, setCadres] = useState([]);
    const [selectedCadre, setSelectedCadre] = useState(null);
    const [open, setOpen] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [cadreToDelete, setCadreToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadCadres();
    }, []);

    const filteredCadres = useMemo(
        () => cadres.filter((cadre) => matchesSearch(cadre, searchKeyword)),
        [cadres, searchKeyword]
    );

    const loadCadres = async () => {
        try {
            const data = await getCadres();
            setCadres(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleCreate = async (data) => {
        try {
            await createCadre(data);
            toast.success("Cadre position created");
            setOpen(false);
            loadCadres();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {
        try {
            await updateCadre(selectedCadre.id, data);
            toast.success("Cadre position updated");
            setOpen(false);
            setSelectedCadre(null);
            loadCadres();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleDeleteClick = (cadre) => {
        setCadreToDelete(cadre);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteCadre(cadreToDelete.id);
            toast.success("Cadre position deleted");
            setDeleteDialogOpen(false);
            setCadreToDelete(null);
            loadCadres();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const openCreateDialog = () => {
        setSelectedCadre(null);
        setOpen(true);
    };

    const openEditDialog = (cadre) => {
        setSelectedCadre(cadre);
        setOpen(true);
    };

    const closeFormDialog = () => {
        setOpen(false);
        setSelectedCadre(null);
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
                            Cadre Positions
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Define approved cadre positions by designation and headcount
                            for vacancy and excess reporting.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Cadre Position
                    </Button>
                </Stack>

                <TextField
                    label="Search cadre positions"
                    placeholder="Designation, service, approved count..."
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
                    Showing {filteredCadres.length} of {cadres.length} cadre position
                    {cadres.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {filteredCadres.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary" gutterBottom>
                        {searchKeyword.trim()
                            ? "No cadre positions match your search"
                            : "No cadre positions configured yet"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {searchKeyword.trim()
                            ? "Try a different search term"
                            : "Create your first cadre position to get started"}
                    </Typography>
                    {!searchKeyword.trim() && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                        >
                            Add Cadre Position
                        </Button>
                    )}
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Designation</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell>Service Level</TableCell>
                                <TableCell align="center">Approved Count</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredCadres.map((cadre) => (
                                <TableRow
                                    key={cadre.id}
                                    hover
                                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {cadre.designation?.designationName ?? "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {cadre.designation?.service?.serviceCode ?? "—"}
                                        </Typography>
                                        {cadre.designation?.service?.description && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                {cadre.designation.service.description}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {cadre.designation?.serviceLevel?.levelName ?? "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={cadre.approvedCount}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit cadre position">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEditDialog(cadre)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete cadre position">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(cadre)}
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
            )}

            <CadreForm
                open={open}
                handleClose={closeFormDialog}
                handleSubmit={selectedCadre ? handleUpdate : handleCreate}
                selectedCadre={selectedCadre}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Cadre Position</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Deleting a cadre position may affect vacancy and excess reports.
                    </Alert>
                    <Typography>
                        Are you sure you want to delete the cadre position for "
                        {cadreToDelete?.designation?.designationName}"?
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
