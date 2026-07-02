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
    Clear as ClearIcon,
    DragIndicator as DragIndicatorIcon
} from "@mui/icons-material";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
    getCadres,
    createCadre,
    updateCadre,
    deleteCadre,
    reorderCadres
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

function SortableCadreRow({
    cadre,
    canReorder,
    onEdit,
    onDelete
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: cadre.id,
        disabled: !canReorder
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <TableRow
            ref={setNodeRef}
            component="div"
            style={style}
            hover
            sx={{
                display: "table-row",
                opacity: isDragging ? 0.5 : 1,
                bgcolor: isDragging ? "action.hover" : undefined,
                "&:last-child .MuiTableCell-root": { borderBottom: 0 }
            }}
        >
            <TableCell
                component="div"
                width={48}
                padding="checkbox"
                sx={{ display: "table-cell", verticalAlign: "middle" }}
            >
                <Box
                    {...attributes}
                    {...listeners}
                    title={canReorder ? "Drag to reorder" : "Clear search to reorder"}
                    aria-label="Drag to reorder"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        color: canReorder ? "text.secondary" : "action.disabled",
                        cursor: canReorder ? "grab" : "not-allowed",
                        touchAction: "none",
                        userSelect: "none",
                        "&:active": {
                            cursor: canReorder ? "grabbing" : "not-allowed"
                        }
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>
            </TableCell>
            <TableCell component="div" sx={{ display: "table-cell", verticalAlign: "middle" }}>
                <Typography variant="body2" fontWeight={500}>
                    {cadre.designation?.designationName ?? "—"}
                </Typography>
            </TableCell>
            <TableCell component="div" sx={{ display: "table-cell", verticalAlign: "middle" }}>
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
            <TableCell component="div" sx={{ display: "table-cell", verticalAlign: "middle" }}>
                <Typography variant="body2" color="text.secondary">
                    {cadre.designation?.serviceLevel?.levelName ?? "—"}
                </Typography>
            </TableCell>
            <TableCell
                component="div"
                align="center"
                sx={{ display: "table-cell", verticalAlign: "middle" }}
            >
                <Chip
                    label={cadre.approvedCount}
                    size="small"
                    color="primary"
                    variant="outlined"
                />
            </TableCell>
            <TableCell
                component="div"
                align="right"
                sx={{ display: "table-cell", verticalAlign: "middle" }}
            >
                <Tooltip title="Edit cadre position">
                    <IconButton
                        size="small"
                        onClick={() => onEdit(cadre)}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete cadre position">
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(cadre)}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
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
    const [savingOrder, setSavingOrder] = useState(false);

    const isSearchActive = Boolean(searchKeyword.trim());
    const canReorder = !isSearchActive && !savingOrder;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    useEffect(() => {
        loadCadres();
    }, []);

    const filteredCadres = useMemo(
        () => cadres.filter((cadre) => matchesSearch(cadre, searchKeyword)),
        [cadres, searchKeyword]
    );

    const sortableCadreIds = useMemo(
        () => filteredCadres.map((cadre) => cadre.id),
        [filteredCadres]
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

    const handleDragEnd = async ({ active, over }) => {
        if (!canReorder || !over || active.id === over.id) {
            return;
        }

        const activeId = Number(active.id);
        const overId = Number(over.id);
        const oldIndex = cadres.findIndex((cadre) => Number(cadre.id) === activeId);
        const newIndex = cadres.findIndex((cadre) => Number(cadre.id) === overId);

        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        const previousCadres = cadres;
        const reordered = arrayMove(cadres, oldIndex, newIndex);

        setCadres(reordered);
        setSavingOrder(true);

        try {
            await reorderCadres(reordered.map((cadre) => cadre.id));
        } catch (error) {
            setCadres(previousCadres);
            toast.error(getApiErrorMessage(error));
        } finally {
            setSavingOrder(false);
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
                            for vacancy and excess reporting. Drag rows to set the order
                            used in cadre reports.
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
                    {isSearchActive ? " — clear search to reorder rows" : ""}
                    {savingOrder ? " — saving order..." : ""}
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
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <TableContainer component={Paper} variant="outlined">
                        <Table component="div" sx={{ display: "table", width: "100%" }}>
                            <TableHead component="div" sx={{ display: "table-header-group" }}>
                                <TableRow component="div" sx={{ display: "table-row" }}>
                                    <TableCell component="div" width={48} sx={{ display: "table-cell" }} />
                                    <TableCell component="div" sx={{ display: "table-cell" }}>Designation</TableCell>
                                    <TableCell component="div" sx={{ display: "table-cell" }}>Service</TableCell>
                                    <TableCell component="div" sx={{ display: "table-cell" }}>Service Level</TableCell>
                                    <TableCell component="div" align="center" sx={{ display: "table-cell" }}>
                                        Approved Count
                                    </TableCell>
                                    <TableCell component="div" align="right" sx={{ display: "table-cell" }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody component="div" sx={{ display: "table-row-group" }}>
                                <SortableContext
                                    items={sortableCadreIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredCadres.map((cadre) => (
                                        <SortableCadreRow
                                            key={cadre.id}
                                            cadre={cadre}
                                            canReorder={canReorder}
                                            onEdit={openEditDialog}
                                            onDelete={handleDeleteClick}
                                        />
                                    ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DndContext>
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
