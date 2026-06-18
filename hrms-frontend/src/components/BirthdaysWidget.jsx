import React from "react";
import {
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    Skeleton,
    Alert
} from "@mui/material";
import CakeIcon from "@mui/icons-material/Cake";
import { useNavigate } from "react-router-dom";
import { formatEmployeeDate } from "../utils/employeeRetirement";

export default function BirthdaysWidget({ data, loading }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                <Skeleton variant="text" width="50%" height={32} />
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={40} sx={{ mt: 1 }} />
                ))}
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Birthdays This Month
            </Typography>

            {!data || data.length === 0 ? (
                <Alert severity="info">No birthdays this month</Alert>
            ) : (
                <List dense disablePadding>
                    {data.map((person) => (
                        <ListItem
                            key={person.employeeId}
                            disableGutters
                            sx={{
                                cursor: "pointer",
                                borderRadius: 1,
                                "&:hover": { bgcolor: "action.hover" }
                            }}
                            onClick={() => navigate(`/employees/${person.employeeId}`)}
                        >
                            <CakeIcon sx={{ mr: 1.5, color: "#B45309", fontSize: 20 }} />
                            <ListItemText
                                primary={person.employeeName}
                                secondary={formatEmployeeDate(person.dateOfBirth)}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );
}
