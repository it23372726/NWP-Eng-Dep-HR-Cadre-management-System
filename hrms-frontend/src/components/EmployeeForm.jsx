import { useRef } from "react";

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle
} from "@mui/material";

import { dialogActionsSx } from "../utils/formLayout";
import EmployeeCreateForm from "./employee-form/EmployeeCreateForm";
import EmployeeEditForm from "./employee-form/EmployeeEditForm";

export default function EmployeeForm({
    open,
    handleClose,
    handleSubmit,
    selectedEmployee,
    actionHistory
}) {
    const formRef = useRef(null);
    const isEdit = Boolean(selectedEmployee);

    const submitForm = () => {
        formRef.current?.submit();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="lg"
            scroll="paper"
            onTransitionExited={() => {
                document.activeElement?.blur();
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {isEdit ? "Edit Employee" : "Add Employee"}
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    bgcolor: "grey.50",
                    px: { xs: 2, sm: 3 },
                    py: 2
                }}
            >
                {isEdit ? (
                    <EmployeeEditForm
                        ref={formRef}
                        employee={selectedEmployee}
                        actionHistory={actionHistory}
                        open={open}
                        handleSubmit={handleSubmit}
                    />
                ) : (
                    <EmployeeCreateForm
                        ref={formRef}
                        open={open}
                        handleSubmit={handleSubmit}
                    />
                )}
            </DialogContent>

            <DialogActions sx={dialogActionsSx}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={submitForm}>
                    {isEdit ? "Save Changes" : "Add Employee"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
