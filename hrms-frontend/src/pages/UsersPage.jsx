import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    LockReset as LockResetIcon,
    Search as SearchIcon
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getStoredUser } from "../hooks/useAuth";
import { getApiErrorMessage } from "../constants/hrms";
import {
    DEFAULT_ASSIGNABLE_ROLE,
    ROLE_COLORS,
    ROLE_DESCRIPTIONS,
    ROLES
} from "../constants/roles";
import ManageRolesTab from "../components/ManageRolesTab";
import MobileDataCard, {
    DesktopTableWrapper,
    MobileDataCardList
} from "../components/MobileDataCard";
import {
    createUser,
    getUsers,
    resetUserPassword,
    updateUser
} from "../services/userService";

const emptyCreateForm = {
    username: "",
    password: "",
    confirmPassword: "",
    role: DEFAULT_ASSIGNABLE_ROLE
};

export default function UsersPage() {
    const currentUser = getStoredUser();
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [loading, setLoading] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);
    const [creating, setCreating] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editForm, setEditForm] = useState({ role: DEFAULT_ASSIGNABLE_ROLE, active: true });
    const [saving, setSaving] = useState(false);

    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordUser, setPasswordUser] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
    const [resetting, setResetting] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load users"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) {
            return users;
        }
        return users.filter((user) =>
            user.username.toLowerCase().includes(keyword)
            || user.role.toLowerCase().includes(keyword)
        );
    }, [users, searchKeyword]);

    const isSelf = (user) => user.username === currentUser?.username;

    const handleCreate = async () => {
        if (createForm.password !== createForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setCreating(true);
        try {
            await createUser({
                username: createForm.username.trim(),
                password: createForm.password,
                role: createForm.role
            });
            toast.success("User created");
            setCreateOpen(false);
            setCreateForm(emptyCreateForm);
            loadUsers();
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to create user"));
        } finally {
            setCreating(false);
        }
    };

    const openEditDialog = (user) => {
        setEditUser(user);
        setEditForm({ role: user.role, active: user.active });
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editUser) {
            return;
        }

        setSaving(true);
        try {
            await updateUser(editUser.id, editForm);
            toast.success("User updated");
            setEditOpen(false);
            setEditUser(null);
            loadUsers();
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to update user"));
        } finally {
            setSaving(false);
        }
    };

    const openPasswordDialog = (user) => {
        setPasswordUser(user);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
        setPasswordOpen(true);
    };

    const handleResetPassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (!passwordUser) {
            return;
        }

        setResetting(true);
        try {
            await resetUserPassword(passwordUser.id, passwordForm.newPassword);
            toast.success("Password reset");
            setPasswordOpen(false);
            setPasswordUser(null);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to reset password"));
        } finally {
            setResetting(false);
        }
    };

    return (
        <Box>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                    mb: 2,
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" }
                }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={800}>
                        User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create and manage system login accounts and role permissions.
                    </Typography>
                </Box>
                {activeTab === 0 && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                    >
                        Add User
                    </Button>
                )}
            </Stack>

            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                >
                    <Tab label="Users" />
                    {isSuperAdmin && <Tab label="Manage Roles" />}
                </Tabs>
            </Paper>

            {activeTab === 1 && isSuperAdmin ? (
                <ManageRolesTab />
            ) : (
                <>
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search users"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "text.secondary" }} />
                                </InputAdornment>
                            )
                        }
                    }}
                />
            </Paper>

            <DesktopTableWrapper>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Username</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ alignItems: "center" }}
                                    >
                                        <Typography variant="body2">{user.username}</Typography>
                                        {isSelf(user) && (
                                            <Chip label="You" size="small" color="info" />
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        color={ROLE_COLORS[user.role] || "default"}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.active ? "Active" : "Inactive"}
                                        size="small"
                                        color={user.active ? "success" : "default"}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Stack
                                        direction="row"
                                        spacing={0.5}
                                        sx={{ justifyContent: "flex-end" }}
                                    >
                                        <Tooltip title="Edit user">
                                            <Button
                                                size="small"
                                                startIcon={<EditIcon />}
                                                onClick={() => openEditDialog(user)}
                                            >
                                                Edit
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="Reset password">
                                            <Button
                                                size="small"
                                                startIcon={<LockResetIcon />}
                                                onClick={() => openPasswordDialog(user)}
                                            >
                                                Password
                                            </Button>
                                        </Tooltip>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && filteredUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No users found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            </DesktopTableWrapper>

            <MobileDataCardList>
                {filteredUsers.map((user) => (
                    <MobileDataCard
                        key={user.id}
                        title={
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <span>{user.username}</span>
                                {isSelf(user) && (
                                    <Chip label="You" size="small" color="info" />
                                )}
                            </Stack>
                        }
                        fields={[
                            {
                                label: "Role",
                                value: (
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        color={ROLE_COLORS[user.role] || "default"}
                                    />
                                )
                            },
                            {
                                label: "Status",
                                value: (
                                    <Chip
                                        label={user.active ? "Active" : "Inactive"}
                                        size="small"
                                        color={user.active ? "success" : "default"}
                                    />
                                )
                            }
                        ]}
                        actions={
                            <>
                                <Tooltip title="Edit user">
                                    <IconButton
                                        size="small"
                                        onClick={() => openEditDialog(user)}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Reset password">
                                    <IconButton
                                        size="small"
                                        onClick={() => openPasswordDialog(user)}
                                    >
                                        <LockResetIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        }
                    />
                ))}
                {!loading && filteredUsers.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                        <Typography color="text.secondary">No users found</Typography>
                    </Paper>
                )}
            </MobileDataCardList>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add User</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Username"
                            value={createForm.username}
                            onChange={(e) =>
                                setCreateForm((prev) => ({ ...prev, username: e.target.value }))
                            }
                            required
                            fullWidth
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={createForm.password}
                            onChange={(e) =>
                                setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                            }
                            required
                            fullWidth
                            helperText="Minimum 8 characters"
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            value={createForm.confirmPassword}
                            onChange={(e) =>
                                setCreateForm((prev) => ({
                                    ...prev,
                                    confirmPassword: e.target.value
                                }))
                            }
                            required
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                label="Role"
                                value={createForm.role}
                                onChange={(e) =>
                                    setCreateForm((prev) => ({ ...prev, role: e.target.value }))
                                }
                            >
                                {ROLES.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        {role}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary">
                            {ROLE_DESCRIPTIONS[createForm.role]}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={creating}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Username"
                            value={editUser?.username || ""}
                            disabled
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                label="Role"
                                value={editForm.role}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, role: e.target.value }))
                                }
                            >
                                {ROLES.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        {role}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary">
                            {ROLE_DESCRIPTIONS[editForm.role]}
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editForm.active}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            active: e.target.checked
                                        }))
                                    }
                                    disabled={editUser && isSelf(editUser)}
                                />
                            }
                            label={editForm.active ? "Active" : "Inactive"}
                        />
                        {editUser && isSelf(editUser) && (
                            <Alert severity="info">
                                You cannot deactivate your own account.
                            </Alert>
                        )}
                        {editUser && !editForm.active && !isSelf(editUser) && (
                            <Alert severity="warning">
                                Deactivated users cannot log in until reactivated.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdate} disabled={saving}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Typography variant="body2">
                            Set a new password for <strong>{passwordUser?.username}</strong>.
                        </Typography>
                        <TextField
                            label="New Password"
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                                setPasswordForm((prev) => ({
                                    ...prev,
                                    newPassword: e.target.value
                                }))
                            }
                            required
                            fullWidth
                            helperText="Minimum 8 characters"
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                                setPasswordForm((prev) => ({
                                    ...prev,
                                    confirmPassword: e.target.value
                                }))
                            }
                            required
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleResetPassword} disabled={resetting}>
                        Reset Password
                    </Button>
                </DialogActions>
            </Dialog>
                </>
            )}
        </Box>
    );
}
