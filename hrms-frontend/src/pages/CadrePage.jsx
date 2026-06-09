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
    Button

} from "@mui/material";

import {
    useEffect,
    useState
} from "react";

import toast from "react-hot-toast";

import {

    getCadres,
    createCadre,
    updateCadre,
    deleteCadre

} from "../services/cadreService";

import CadreForm
from "../components/CadreForm";

export default function CadrePage() {

    const [cadres, setCadres] =
        useState([]);

    const [selectedCadre,
        setSelectedCadre] =
        useState(null);

    const [open, setOpen] =
        useState(false);

    useEffect(() => {

        loadCadres();

    }, []);

    const loadCadres = async () => {

        try {

            const data =
                await getCadres();

            setCadres(data);

        } catch (error) {

            toast.error(
                "Failed to load cadres"
            );
        }
    };

    const handleCreate = async (data) => {

        try {

            await createCadre(data);

            toast.success(
                "Cadre created"
            );

            setOpen(false);

            loadCadres();

        } catch (error) {

            toast.error(
                "Failed to create cadre"
            );
        }
    };

    const handleUpdate =
    async (data) => {

        try {

            await updateCadre(
                selectedCadre.id,
                data
            );

            toast.success(
                "Cadre updated"
            );

            setOpen(false);

            setSelectedCadre(null);

            loadCadres();

        } catch (error) {

            toast.error(
                "Failed to update cadre"
            );
        }
    };

    const handleDelete =
    async (id) => {

        if (
            window.confirm(
                "Delete this cadre?"
            )
        ) {

            try {

                await deleteCadre(id);

                toast.success(
                    "Cadre deleted"
                );

                loadCadres();

            } catch (error) {

                toast.error(
                    "Failed to delete cadre"
                );
            }
        }
    };

    return (

        <Container>

            <Button
                variant="contained"
                sx={{ mb: 3 }}
                onClick={() => {

                    setSelectedCadre(null);

                    setOpen(true);
                }}
            >
                Add Cadre
            </Button>

            <Typography
                variant="h4"
                gutterBottom
            >
                Cadre Positions
            </Typography>

            <TableContainer
                component={Paper}
            >

                <Table>

                    <TableHead>

                        <TableRow>

                            <TableCell>
                                Designation
                            </TableCell>

                            <TableCell>
                                Service
                            </TableCell>

                            <TableCell>
                                Approved Count
                            </TableCell>

                            <TableCell>
                                Actions
                            </TableCell>

                        </TableRow>

                    </TableHead>

                    <TableBody>

                        {cadres.map(cadre => (

                            <TableRow
                                key={cadre.id}
                            >

                                <TableCell>
                                    {
                                        cadre.designation
                                        .designationName
                                    }
                                </TableCell>

                                <TableCell>
                                    {cadre.designation?.service
                                        ? `${cadre.designation.service.serviceCode} — ${cadre.designation.service.description}`
                                        : "—"}
                                </TableCell>

                                <TableCell>
                                    {
                                        cadre.approvedCount
                                    }
                                </TableCell>

                                <TableCell>

                                    <Button
                                        size="small"
                                        onClick={() => {

                                            setSelectedCadre(cadre);

                                            setOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                            handleDelete(cadre.id)
                                        }
                                    >
                                        Delete
                                    </Button>

                                </TableCell>

                            </TableRow>
                        ))}

                    </TableBody>

                </Table>

            </TableContainer>

            <CadreForm
                open={open}
                handleClose={() => {

                    setOpen(false);

                    setSelectedCadre(null);
                }}
                handleSubmit={
                    selectedCadre
                        ? handleUpdate
                        : handleCreate
                }
                selectedCadre={selectedCadre}
            />

        </Container>
    );
}