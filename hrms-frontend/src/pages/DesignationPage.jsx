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
    Stack

} from "@mui/material";

import {
    useEffect,
    useState
} from "react";

import toast from "react-hot-toast";

import {

    getDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    searchDesignations

} from "../services/designationService";

import DesignationForm
from "../components/DesignationForm";

export default function DesignationPage() {

    const [designations, setDesignations] =
        useState([]);

    const [open, setOpen] =
        useState(false);

    const [selectedDesignation,
        setSelectedDesignation] =
        useState(null);

    const [searchKeyword,
        setSearchKeyword] =
        useState("");

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

                const data =
                    await searchDesignations(
                        searchKeyword
                    );

                setDesignations(data);

            } catch (error) {

                console.error(error);
            }

        }, 300);

        return () =>
            clearTimeout(debounce);

    }, [searchKeyword]);

    const loadDesignations = async () => {

        try {

            const data =
                await getDesignations();

            setDesignations(data);

        } catch (error) {

            toast.error(
                "Failed to load designations"
            );
        }
    };

    const handleCreate = async (data) => {

        try {

            await createDesignation(data);

            toast.success(
                "Designation created"
            );

            setOpen(false);

            loadDesignations();

        } catch (error) {

            toast.error(
                "Failed to create designation"
            );
        }
    };

    const handleUpdate = async (data) => {

        try {

            await updateDesignation(
                selectedDesignation.id,
                data
            );

            toast.success(
                "Designation updated"
            );

            setOpen(false);

            setSelectedDesignation(null);

            loadDesignations();

        } catch (error) {

            toast.error(
                "Failed to update designation"
            );
        }
    };

    const handleDelete = async (id) => {

        if (
            window.confirm(
                "Delete this designation?"
            )
        ) {

            try {

                await deleteDesignation(id);

                toast.success(
                    "Designation deleted"
                );

                loadDesignations();

            } catch (error) {

                toast.error(
                    "Failed to delete designation"
                );
            }
        }
    };

    return (

        <Container>

            <Stack
                direction="row"
                spacing={2}
                sx={{ mb: 3 }}
            >

                <Button
                    variant="contained"
                    onClick={() => {

                        setSelectedDesignation(null);

                        setOpen(true);
                    }}
                >
                    Add Designation
                </Button>

                <TextField
                    label="Search Designation"
                    value={searchKeyword}
                    onChange={(e) =>
                        setSearchKeyword(
                            e.target.value
                        )
                    }
                />

            </Stack>

            <Typography
                variant="h4"
                gutterBottom
            >
                Designations
            </Typography>

            <TableContainer
                component={Paper}
            >

                <Table>

                    <TableHead>

                        <TableRow>

                            <TableCell>
                                Designation Name
                            </TableCell>

                            <TableCell>
                                Service
                            </TableCell>

                            <TableCell>
                                Service Level
                            </TableCell>

                            <TableCell>
                                Allowed Grades
                            </TableCell>

                            <TableCell>
                                Salary Code
                            </TableCell>

                            <TableCell>
                                Actions
                            </TableCell>

                        </TableRow>

                    </TableHead>

                    <TableBody>

                        {designations.map(
                            (designation) => (

                            <TableRow
                                key={designation.id}
                            >

                                <TableCell>
                                    {designation.designationName}
                                </TableCell>

                                <TableCell>
                                    {designation.service?.serviceCode ?? "—"}
                                </TableCell>

                                <TableCell>
                                    {designation.serviceLevel?.levelName ?? "—"}
                                </TableCell>

                                <TableCell>
                                    {(designation.allowedGrades || []).join(", ") || "—"}
                                </TableCell>

                                <TableCell>
                                    {designation.salaryCode || "—"}
                                </TableCell>

                                <TableCell>

                                    <Button
                                        size="small"
                                        onClick={() => {

                                            setSelectedDesignation(
                                                designation
                                            );

                                            setOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                            handleDelete(
                                                designation.id
                                            )
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

            <DesignationForm
                open={open}
                handleClose={() => {

                    setOpen(false);

                    setSelectedDesignation(null);
                }}
                handleSubmit={
                    selectedDesignation
                        ? handleUpdate
                        : handleCreate
                }
                selectedDesignation={
                    selectedDesignation
                }
            />

        </Container>
    );
}