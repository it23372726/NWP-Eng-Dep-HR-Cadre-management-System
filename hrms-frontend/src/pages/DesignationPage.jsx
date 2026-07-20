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
    getDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    searchDesignations
} from "../services/designationService";
import DesignationForm from "../components/DesignationForm";
import GradeChips from "../components/GradeChips";
import MobileDataCard, {
    DesktopTableWrapper,
    MobileDataCardList
} from "../components/MobileDataCard";
import { getApiErrorMessage } from "../constants/hrms";

export default function DesignationPage() {
    const [designations, setDesignations] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedDesignation, setSelectedDesignation] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [designationToDelete, setDesignationToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadDesignations();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(async () => {
            if (!searchKeyword.trim()) {
                loadDesignations();
                return;
            }

            try {
                const data = await searchDesignations(searchKeyword);
                setDesignations(data);
            } catch {
                // Keep the current list when a background search is interrupted.
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchKeyword]);

    const loadDesignations = async () => {
        try {
            const data = await getDesignations();
            setDesignations(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleCreate = async (data) => {
        try {
            await createDesignation(data);
            toast.success("Designation created");
            setOpen(false);
            loadDesignations();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {
        try {
            await updateDesignation(selectedDesignation.id, data);
            toast.success("Designation updated");
            setOpen(false);
            setSelectedDesignation(null);
            loadDesignations();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleDeleteClick = (designation) => {
        setDesignationToDelete(designation);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteDesignation(designationToDelete.id);
            toast.success("Designation deleted");
            setDeleteDialogOpen(false);
            setDesignationToDelete(null);
            loadDesignations();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const openCreateDialog = () => {
        setSelectedDesignation(null);
        setOpen(true);
    };

    const openEditDialog = (designation) => {
        setSelectedDesignation(designation);
        setOpen(true);
    };

    const closeFormDialog = () => {
        setOpen(false);
        setSelectedDesignation(null);
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
                            Designations
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Define job designations, allowed grades, and qualification rules
                            for employee assignments and promotions.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Designation
                    </Button>
                </Stack>

                <TextField
                    label="Search designations"
                    placeholder="Name, service, service level, salary code..."
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
                    Showing {designations.length} designation{designations.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {designations.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary" gutterBottom>
                        {searchKeyword.trim()
                            ? "No designations match your search"
                            : "No designations configured yet"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {searchKeyword.trim()
                            ? "Try a different search term"
                            : "Create your first designation to get started"}
                    </Typography>
                    {!searchKeyword.trim() && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                        >
                            Add Designation
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
                                <TableCell>Designation</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell>Service Level</TableCell>
                                <TableCell>Eligible Grades</TableCell>
                                <TableCell>Salary Code</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {designations.map((designation) => (
                                <TableRow
                                    key={designation.id}
                                    hover
                                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {designation.designationName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {designation.service?.serviceCode ?? "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {designation.serviceLevel?.levelName ?? "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <GradeChips grades={designation.allowedGrades} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {designation.salaryCode || "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit designation">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEditDialog(designation)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete designation">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(designation)}
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
                    {designations.map((designation) => (
                        <MobileDataCard
                            key={designation.id}
                            title={designation.designationName}
                            subtitle={designation.service?.serviceCode ?? "—"}
                            fields={[
                                {
                                    label: "Service Level",
                                    value: designation.serviceLevel?.levelName ?? "—"
                                },
                                {
                                    label: "Eligible Grades",
                                    value: <GradeChips grades={designation.allowedGrades} />
                                },
                                {
                                    label: "Salary Code",
                                    value: designation.salaryCode || "—"
                                }
                            ]}
                            actions={
                                <>
                                    <Tooltip title="Edit designation">
                                        <IconButton
                                            size="small"
                                            onClick={() => openEditDialog(designation)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete designation">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(designation)}
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

            <DesignationForm
                open={open}
                handleClose={closeFormDialog}
                handleSubmit={selectedDesignation ? handleUpdate : handleCreate}
                selectedDesignation={selectedDesignation}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Designation</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Deleting a designation may affect cadre positions and employee records
                        linked to it.
                    </Alert>
                    <Typography>
                        Are you sure you want to delete "
                        {designationToDelete?.designationName}"?
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
