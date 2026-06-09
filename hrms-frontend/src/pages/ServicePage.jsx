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

export default function ServicePage() {

    const [services, setServices] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState("");

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

            } catch (error) {

                console.error(error);
            }

        }, 300);

        return () => clearTimeout(debounce);

    }, [searchKeyword]);

    const loadServices = async () => {

        try {

            const data = await getServices();

            setServices(data);

        } catch (error) {

            toast.error("Failed to load services");
        }
    };

    const handleCreate = async (data) => {

        try {

            await createService(data);

            toast.success("Service created");

            setOpen(false);

            loadServices();

        } catch (error) {

            toast.error("Failed to create service");
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

            toast.error("Failed to update service");
        }
    };

    const handleDelete = async (id) => {

        if (window.confirm("Delete this service?")) {

            try {

                await deleteService(id);

                toast.success("Service deleted");

                loadServices();

            } catch (error) {

                toast.error("Failed to delete service");
            }
        }
    };

    return (

        <Container>

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>

                <Button
                    variant="contained"
                    onClick={() => {

                        setSelectedService(null);

                        setOpen(true);
                    }}
                >
                    Add Service
                </Button>

                <TextField
                    label="Search Service"
                    value={searchKeyword}
                    onChange={(e) =>
                        setSearchKeyword(e.target.value)
                    }
                />

            </Stack>

            <Typography variant="h4" gutterBottom>
                Services
            </Typography>

            <TableContainer component={Paper}>

                <Table>

                    <TableHead>

                        <TableRow>

                            <TableCell>Service Code</TableCell>

                            <TableCell>Description</TableCell>

                            <TableCell>Actions</TableCell>

                        </TableRow>

                    </TableHead>

                    <TableBody>

                        {services.map((service) => (

                            <TableRow key={service.id}>

                                <TableCell>
                                    {service.serviceCode}
                                </TableCell>

                                <TableCell>
                                    {service.description}
                                </TableCell>

                                <TableCell>

                                    <Button
                                        size="small"
                                        onClick={() => {

                                            setSelectedService(service);

                                            setOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                            handleDelete(service.id)
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

            <ServiceForm
                open={open}
                handleClose={() => {

                    setOpen(false);

                    setSelectedService(null);
                }}
                handleSubmit={
                    selectedService
                        ? handleUpdate
                        : handleCreate
                }
                selectedService={selectedService}
            />

        </Container>
    );
}
