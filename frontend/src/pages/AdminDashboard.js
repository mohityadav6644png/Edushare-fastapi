import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
  Snackbar,
  Alert,
  Paper,
  Skeleton
} from "@mui/material";
import { AuthContext } from "../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const API = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, pendingRes] = await Promise.all([
        fetch(`${API}/api/admin/users`, { credentials: "include" }),
        fetch(`${API}/api/admin/materials/pending`, { credentials: "include" })
      ]);
      const usersJson = await usersRes.json();
      const pendingJson = await pendingRes.json();
      if (!usersRes.ok) throw new Error(usersJson.message || "Failed to load users");
      if (!pendingRes.ok) throw new Error(pendingJson.message || "Failed to load uploads");
      setUsers(usersJson.data || usersJson || []);
      setUploads(pendingJson.data || pendingJson || []);
      setFeedback([]);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || "Failed to load admin data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setUsers((prev) => prev.filter((u) => (u._id || u.id) !== id));
      setSnackbar({ open: true, message: "User deleted", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || "Delete failed", severity: "error" });
    }
  };

  const approveUpload = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/materials/${id}/approve`, { method: "PUT", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Action failed");
      setUploads((prev) => prev.filter((f) => (f._id || f.id) !== id));
      setSnackbar({ open: true, message: "Material approved", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || "Action failed", severity: "error" });
    }
  };

  const deleteUpload = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/materials/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setUploads((prev) => prev.filter((f) => (f._id || f.id) !== id));
      setSnackbar({ open: true, message: "Material deleted", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || "Delete failed", severity: "error" });
    }
  };

  if (user?.role !== "admin") {
    return (
      <Container sx={{ py: { xs: 3, sm: 5 } }}>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab label="Users" />
        <Tab label="Uploads" />
        <Tab label="Feedback" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {loading ? (
          <Paper sx={{ p: 2 }}>
            <Skeleton variant="text" width={200} />
            <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
          </Paper>
        ) : (
          <>
            {tab === 0 && (
              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u._id || u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Chip label={u.role} size="small" color={u.role === "admin" ? "error" : "primary"} />
                        </TableCell>
                        <TableCell>
                          <Button variant="outlined" color="error" onClick={() => deleteUser(u._id || u.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {tab === 1 && (
              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Uploader</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Semester</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploads.map((f) => (
                      <TableRow key={f._id || f.id}>
                        <TableCell>{f.title}</TableCell>
                        <TableCell>{f.uploader?.name}</TableCell>
                        <TableCell>{f.subject}</TableCell>
                        <TableCell>{f.semester}</TableCell>
                        <TableCell>
                          <Button variant="contained" onClick={() => approveUpload(f._id || f.id)}>Approve</Button>
                          <Button variant="outlined" color="error" sx={{ ml: 1 }} onClick={() => deleteUpload(f._id || f.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {tab === 2 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Feedback listing is not available in backend routes yet.
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard;
