import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
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
    AddRounded as AddIcon,
    AdminPanelSettingsRounded as AdminPanelIcon,
    EditRounded as EditIcon,
    KeyRounded as KeyIcon,
    LockResetRounded as LockResetIcon,
    ManageAccountsRounded as ManageAccountsIcon,
    PeopleAltRounded as PeopleIcon,
    PersonAddAlt1Rounded as PersonAddIcon,
    SearchRounded as SearchIcon,
    VerifiedUserRounded as VerifiedUserIcon
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

const formatRole = (role = "") =>
    role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

function UserAvatar({ username, active = true, size = 38 }) {
    return (
        <Avatar
            sx={{
                width: size,
                height: size,
                bgcolor: active ? "primary.50" : "grey.100",
                color: active ? "primary.main" : "text.secondary",
                fontSize: size <= 38 ? "0.82rem" : "1rem",
                fontWeight: 800,
                border: "1px solid",
                borderColor: active ? "primary.100" : "divider"
            }}
        >
            {(username || "?").charAt(0).toUpperCase()}
        </Avatar>
    );
}

function RoleOption({ role }) {
    return (
        <Stack spacing={0.15}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {formatRole(role)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {ROLE_DESCRIPTIONS[role]}
            </Typography>
        </Stack>
    );
}

function DialogHeading({ icon, title, description }) {
    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "primary.50",
                    color: "primary.main",
                    flexShrink: 0
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="h6">{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>
        </Stack>
    );
}

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

    const activeUserCount = users.filter((user) => user.active).length;
    const adminCount = users.filter((user) => user.role === "SUPER_ADMIN").length;
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
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2.25, sm: 3 },
                    mb: 2.5,
                    overflow: "hidden",
                    position: "relative",
                    background: (theme) =>
                        `linear-gradient(125deg, ${theme.palette.background.paper} 30%, ${theme.palette.primary[50]} 100%)`,
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        right: -65,
                        bottom: -115,
                        bgcolor: "primary.100",
                        opacity: 0.55
                    }
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2.5}
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" }
                    }}
                >
                    <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                borderRadius: 3,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                boxShadow: 2,
                                flexShrink: 0
                            }}
                        >
                            <ManageAccountsIcon />
                        </Box>
                        <Box>
                            <Typography variant="h5">User Management</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Manage login accounts, access roles, and account security.
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ alignItems: { sm: "center" } }}
                    >
                        <Stack direction="row" spacing={1}>
                            <Chip icon={<PeopleIcon />} label={`${users.length} total`} variant="outlined" />
                            <Chip icon={<VerifiedUserIcon />} label={`${activeUserCount} active`} color="success" variant="outlined" />
                        </Stack>
                        {activeTab === 0 && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateOpen(true)}
                            >
                                Add user
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ mb: 2.5, px: { xs: 0.5, sm: 1 } }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="fullWidth"
                    aria-label="User management sections"
                >
                    <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="User accounts" />
                    {isSuperAdmin && (
                        <Tab
                            icon={<AdminPanelIcon fontSize="small" />}
                            iconPosition="start"
                            label="Role permissions"
                        />
                    )}
                </Tabs>
            </Paper>

            {activeTab === 1 && isSuperAdmin ? (
                <ManageRolesTab />
            ) : (
                <>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            sx={{
                                alignItems: { xs: "stretch", sm: "center" },
                                justifyContent: "space-between"
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Search by username or role"
                                aria-label="Search users"
                                value={searchKeyword}
                                onChange={(event) => setSearchKeyword(event.target.value)}
                                sx={{ width: { xs: "100%", sm: 380 } }}
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
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
                                </Typography>
                                {adminCount > 0 && (
                                    <Chip
                                        size="small"
                                        label={`${adminCount} super ${adminCount === 1 ? "admin" : "admins"}`}
                                        color="error"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Paper>

                    {loading ? (
                        <Paper
                            variant="outlined"
                            sx={{ py: 7, display: "grid", placeItems: "center" }}
                        >
                            <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                                <CircularProgress size={30} />
                                <Typography variant="body2" color="text.secondary">
                                    Loading user accounts…
                                </Typography>
                            </Stack>
                        </Paper>
                    ) : (
                        <>
                            <DesktopTableWrapper>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Account</TableCell>
                                                <TableCell>Access role</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredUsers.map((user) => (
                                                <TableRow key={user.id} hover>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                                                            <UserAvatar username={user.username} active={user.active} />
                                                            <Box>
                                                                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                        {user.username}
                                                                    </Typography>
                                                                    {isSelf(user) && (
                                                                        <Chip label="You" size="small" color="info" />
                                                                    )}
                                                                </Stack>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    System login account
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.35} sx={{ alignItems: "flex-start" }}>
                                                            <Chip
                                                                label={formatRole(user.role)}
                                                                size="small"
                                                                color={ROLE_COLORS[user.role] || "default"}
                                                                variant="outlined"
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {ROLE_DESCRIPTIONS[user.role]}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={user.active ? "Active" : "Inactive"}
                                                            size="small"
                                                            color={user.active ? "success" : "default"}
                                                            variant={user.active ? "filled" : "outlined"}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end" }}>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<EditIcon />}
                                                                onClick={() => openEditDialog(user)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Tooltip title="Reset password">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => openPasswordDialog(user)}
                                                                    aria-label={`Reset password for ${user.username}`}
                                                                    sx={{ border: "1px solid", borderColor: "divider" }}
                                                                >
                                                                    <LockResetIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        <Box sx={{ py: 5, textAlign: "center" }}>
                                                            <PeopleIcon sx={{ color: "text.disabled", fontSize: 38 }} />
                                                            <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                                                No users found
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Try a different username or role.
                                                            </Typography>
                                                        </Box>
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
                                            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                                                <UserAvatar username={user.username} active={user.active} size={42} />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                                                        <Typography variant="subtitle2" noWrap>{user.username}</Typography>
                                                        {isSelf(user) && <Chip label="You" size="small" color="info" />}
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">
                                                        System login account
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        }
                                        fields={[
                                            {
                                                label: "Access role",
                                                value: (
                                                    <Chip
                                                        label={formatRole(user.role)}
                                                        size="small"
                                                        color={ROLE_COLORS[user.role] || "default"}
                                                        variant="outlined"
                                                    />
                                                )
                                            },
                                            {
                                                label: "Account status",
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
                                                        aria-label={`Edit ${user.username}`}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Reset password">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openPasswordDialog(user)}
                                                        aria-label={`Reset password for ${user.username}`}
                                                    >
                                                        <LockResetIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        }
                                    />
                                ))}
                                {filteredUsers.length === 0 && (
                                    <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                                        <PeopleIcon sx={{ color: "text.disabled", fontSize: 38 }} />
                                        <Typography variant="subtitle2" sx={{ mt: 1 }}>No users found</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Try a different username or role.
                                        </Typography>
                                    </Paper>
                                )}
                            </MobileDataCardList>
                        </>
                    )}

                    <Dialog
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle sx={{ pb: 1.5 }}>
                            <DialogHeading
                                icon={<PersonAddIcon fontSize="small" />}
                                title="Add user account"
                                description="Create login details and assign an access role."
                            />
                        </DialogTitle>
                        <DialogContent sx={{ pt: 1.5 }}>
                            <Stack spacing={2}>
                                <TextField
                                    label="Username"
                                    value={createForm.username}
                                    onChange={(event) =>
                                        setCreateForm((previous) => ({ ...previous, username: event.target.value }))
                                    }
                                    required
                                    fullWidth
                                    autoFocus
                                    autoComplete="off"
                                    placeholder="Enter a unique username"
                                />
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                        gap: 2
                                    }}
                                >
                                    <TextField
                                        label="Password"
                                        type="password"
                                        value={createForm.password}
                                        onChange={(event) =>
                                            setCreateForm((previous) => ({ ...previous, password: event.target.value }))
                                        }
                                        required
                                        fullWidth
                                        autoComplete="new-password"
                                        helperText="Minimum 8 characters"
                                    />
                                    <TextField
                                        label="Confirm password"
                                        type="password"
                                        value={createForm.confirmPassword}
                                        onChange={(event) =>
                                            setCreateForm((previous) => ({
                                                ...previous,
                                                confirmPassword: event.target.value
                                            }))
                                        }
                                        required
                                        fullWidth
                                        autoComplete="new-password"
                                    />
                                </Box>
                                <FormControl fullWidth>
                                    <InputLabel>Access role</InputLabel>
                                    <Select
                                        label="Access role"
                                        value={createForm.role}
                                        onChange={(event) =>
                                            setCreateForm((previous) => ({ ...previous, role: event.target.value }))
                                        }
                                        renderValue={(selected) => formatRole(selected)}
                                    >
                                        {ROLES.map((role) => (
                                            <MenuItem key={role} value={role} sx={{ py: 1 }}>
                                                <RoleOption role={role} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Alert severity="info" icon={<AdminPanelIcon />}>
                                    {ROLE_DESCRIPTIONS[createForm.role]}
                                </Alert>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? "Creating…" : "Create user"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog
                        open={editOpen}
                        onClose={() => setEditOpen(false)}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle sx={{ pb: 1.5 }}>
                            <DialogHeading
                                icon={<EditIcon fontSize="small" />}
                                title="Edit user account"
                                description="Update the access role and account status."
                            />
                        </DialogTitle>
                        <DialogContent sx={{ pt: 1.5 }}>
                            <Stack spacing={2}>
                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
                                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                                        <UserAvatar username={editUser?.username} active={editForm.active} size={42} />
                                        <Box>
                                            <Typography variant="subtitle2">{editUser?.username}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Username cannot be changed
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                                <FormControl fullWidth>
                                    <InputLabel>Access role</InputLabel>
                                    <Select
                                        label="Access role"
                                        value={editForm.role}
                                        onChange={(event) =>
                                            setEditForm((previous) => ({ ...previous, role: event.target.value }))
                                        }
                                        renderValue={(selected) => formatRole(selected)}
                                    >
                                        {ROLES.map((role) => (
                                            <MenuItem key={role} value={role} sx={{ py: 1 }}>
                                                <RoleOption role={role} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Alert severity="info" icon={<AdminPanelIcon />}>
                                    {ROLE_DESCRIPTIONS[editForm.role]}
                                </Alert>
                                <Paper variant="outlined" sx={{ p: 1.5 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={editForm.active}
                                                onChange={(event) =>
                                                    setEditForm((previous) => ({
                                                        ...previous,
                                                        active: event.target.checked
                                                    }))
                                                }
                                                disabled={editUser && isSelf(editUser)}
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {editForm.active ? "Account active" : "Account inactive"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {editForm.active
                                                        ? "This user can sign in to the system."
                                                        : "This user is blocked from signing in."}
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ m: 0, alignItems: "center" }}
                                    />
                                </Paper>
                                {editUser && isSelf(editUser) && (
                                    <Alert severity="info">You cannot deactivate your own account.</Alert>
                                )}
                                {editUser && !editForm.active && !isSelf(editUser) && (
                                    <Alert severity="warning">
                                        Deactivated users cannot log in until reactivated.
                                    </Alert>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleUpdate} disabled={saving}>
                                {saving ? "Saving…" : "Save changes"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog
                        open={passwordOpen}
                        onClose={() => setPasswordOpen(false)}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle sx={{ pb: 1.5 }}>
                            <DialogHeading
                                icon={<KeyIcon fontSize="small" />}
                                title="Reset password"
                                description={`Set new login credentials for ${passwordUser?.username || "this user"}.`}
                            />
                        </DialogTitle>
                        <DialogContent sx={{ pt: 1.5 }}>
                            <Stack spacing={2}>
                                <Alert severity="warning">
                                    The current password will stop working as soon as this change is saved.
                                </Alert>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                        gap: 2
                                    }}
                                >
                                    <TextField
                                        label="New password"
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(event) =>
                                            setPasswordForm((previous) => ({
                                                ...previous,
                                                newPassword: event.target.value
                                            }))
                                        }
                                        required
                                        fullWidth
                                        autoComplete="new-password"
                                        helperText="Minimum 8 characters"
                                        autoFocus
                                    />
                                    <TextField
                                        label="Confirm new password"
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(event) =>
                                            setPasswordForm((previous) => ({
                                                ...previous,
                                                confirmPassword: event.target.value
                                            }))
                                        }
                                        required
                                        fullWidth
                                        autoComplete="new-password"
                                    />
                                </Box>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
                            <Button
                                variant="contained"
                                startIcon={<KeyIcon />}
                                onClick={handleResetPassword}
                                disabled={resetting}
                            >
                                {resetting ? "Resetting…" : "Reset password"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Box>
    );
}
