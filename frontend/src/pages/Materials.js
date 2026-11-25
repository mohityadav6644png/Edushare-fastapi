import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Rating,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Skeleton,
  IconButton,
} from "@mui/material";
import { 
  Search, 
  Download, 
  SearchOff, 
  Edit, 
  Delete,
  Close 
} from "@mui/icons-material";

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [visibleCount, setVisibleCount] = useState(9);
  const [currentUser, setCurrentUser] = useState(null);

  // Rating dialog state
  const [rateOpen, setRateOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [comment, setComment] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    subject: "",
    semester: "",
  });

  // Delete confirmation dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const API = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    fetchCurrentUser();
    fetchMaterials();
    setVisibleCount(9);
  }, [searchTerm, filterSemester]);

  // Fetch current logged-in user
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { 
        credentials: "include" 
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data?.data || null);
        console.log("Current user:", data?.data);
      }
    } catch (err) {
      console.log("Not logged in or error fetching user:", err);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterSemester) params.append("semester", filterSemester);
      
      const url = `${API}/api/materials?${params.toString()}`;
      console.log("🔍 Fetching materials from:", url);
      
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      console.log("📦 Raw API Response:", data);

      if (!res.ok) {
        console.error("❌ API Error:", data);
        throw new Error(data.message || "Failed to fetch materials");
      }

      // Debug: Check what we got
      console.log("✅ API returned:", {
        success: data.success,
        count: data.count,
        dataLength: data?.data?.length,
        firstItem: data?.data?.[0]
      });

      // Normalize API data - handle multiple possible field names
      const normalized = (data?.data || []).map((m) => {
        const material = {
          _id: m._id || m.id,
          title: m.title || "Untitled",
          description: m.description || "",
          subject: m.subject || "Unknown",
          semester: m.semester || 1,
          averageRating: m.averageRating || 0,
          ratingCount: m.totalRatings || m.ratingCount || 0,
          uploadedBy: {
            id: m.uploader?.id || m.uploaderId?._id || m.uploaderId,
            name: m.uploader?.name || m.uploadedBy?.name || "Unknown"
          },
          createdAt: m.uploadDate || m.createdAt || new Date().toISOString(),
          filename: m.fileName || m.filename || "file.pdf",
          downloadCount: m.downloadCount || 0,
        };
        
        console.log("🔄 Normalized material:", material);
        return material;
      });

      console.log("✅ Final normalized materials:", normalized);
      setMaterials(normalized);
    } catch (err) {
      console.error("❌ Failed to fetch materials:", err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: "error",
      });
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = (materials || []).filter((material) => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || material.subject === filterSubject;
    const matchesSemester =
      !filterSemester || String(material.semester) === String(filterSemester);

    return matchesSearch && matchesSubject && matchesSemester;
  });

  // Check if current user owns the material
  const isOwner = (material) => {
    if (!currentUser || !material) return false;
    const userId = currentUser._id || currentUser.id;
    const uploaderId = material.uploadedBy?.id || material.uploadedBy?._id;
    return userId === uploaderId;
  };

  const handleDownload = async (materialId, filename) => {
    try {
      console.log("⬇️ Downloading:", materialId, filename);
      const res = await fetch(`${API}/api/materials/${materialId}/download`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Download failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log("✅ Download successful");
    } catch (err) {
      console.error("❌ Download failed:", err);
      setSnackbar({
        open: true,
        message: "Download failed",
        severity: "error",
      });
    }
  };

  // RATING HANDLERS
  const handleOpenRate = (material) => {
    console.log("⭐ Opening rating dialog for:", material);
    setSelectedMaterial(material);
    setRatingValue(0);
    setComment("");
    setRateOpen(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedMaterial) return;
    
    console.log("📤 Submitting rating:", {
      materialId: selectedMaterial._id,
      rating: ratingValue,
      comment: comment
    });

    try {
      const res = await fetch(
        `${API}/api/materials/${selectedMaterial._id}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ rating: ratingValue, comment }),
        }
      );
      const data = await res.json();
      
      console.log("📥 Rating response:", { status: res.status, data });

      if (!res.ok) throw new Error(data.message || "Failed to submit feedback");
      
      setSnackbar({
        open: true,
        message: "Feedback submitted successfully",
        severity: "success",
      });
      setRateOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error("❌ Rating error:", err);
      setSnackbar({
        open: true,
        message: err.message || "Failed to submit feedback",
        severity: "error",
      });
    }
  };

  // EDIT HANDLERS
  const handleOpenEdit = (material) => {
    console.log("✏️ Opening edit dialog for:", material);
    setSelectedMaterial(material);
    setEditData({
      title: material.title || "",
      description: material.description || "",
      subject: material.subject || "",
      semester: material.semester || "",
    });
    setEditOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitEdit = async () => {
    if (!selectedMaterial) return;

    console.log("📤 Updating material:", selectedMaterial._id, editData);

    try {
      const res = await fetch(
        `${API}/api/materials/${selectedMaterial._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editData),
        }
      );
      const data = await res.json();

      console.log("📥 Update response:", { status: res.status, data });

      if (!res.ok) throw new Error(data.message || "Failed to update material");

      setSnackbar({
        open: true,
        message: "Material updated successfully",
        severity: "success",
      });
      setEditOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error("❌ Update error:", err);
      setSnackbar({
        open: true,
        message: err.message || "Failed to update material",
        severity: "error",
      });
    }
  };

  // DELETE HANDLERS
  const handleOpenDelete = (material) => {
    console.log("🗑️ Opening delete confirmation for:", material);
    setMaterialToDelete(material);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;

    console.log("📤 Deleting material:", materialToDelete._id);

    try {
      const res = await fetch(
        `${API}/api/materials/${materialToDelete._id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();

      console.log("📥 Delete response:", { status: res.status, data });

      if (!res.ok) throw new Error(data.message || "Failed to delete material");

      setSnackbar({
        open: true,
        message: "Material deleted successfully",
        severity: "success",
      });
      setDeleteOpen(false);
      setMaterialToDelete(null);
      fetchMaterials();
    } catch (err) {
      console.error("❌ Delete error:", err);
      setSnackbar({
        open: true,
        message: err.message || "Failed to delete material",
        severity: "error",
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Study Materials
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Discover and download study materials shared by the EduShare community.
      </Typography>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={{ xs: 2, sm: 2, md: 2 }} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search materials..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={filterSubject}
                label="Subject"
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <MenuItem value="">All Subjects</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
                <MenuItem value="Chemistry">Chemistry</MenuItem>
                <MenuItem value="Computer Science">Computer Science</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Business">Business</MenuItem>
                <MenuItem value="Literature">Literature</MenuItem>
                <MenuItem value="History">History</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Semester</InputLabel>
              <Select
                value={filterSemester}
                label="Semester"
                onChange={(e) => setFilterSemester(e.target.value)}
              >
                <MenuItem value="">All Semesters</MenuItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredMaterials.length} materials found
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Materials Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Skeleton variant="rounded" height={280} animation="wave" />
            </Grid>
          ))}
        </Grid>
      ) : filteredMaterials.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <SearchOff sx={{ fontSize: 56, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
            No materials found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or check back later for new uploads.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredMaterials.slice(0, visibleCount).map((material) => (
            <Grid item xs={12} sm={6} md={4} key={material._id}>
              <Card
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ flexGrow: 1, pr: 1 }}>
                      {material.title}
                    </Typography>
                    {isOwner(material) && (
                      <Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenEdit(material)}
                          aria-label="Edit material"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDelete(material)}
                          color="error"
                          aria-label="Delete material"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {material.description || "No description provided"}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                    <Chip label={material.subject} size="small" color="primary" />
                    <Chip label={`Sem ${material.semester}`} size="small" />
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Rating value={material.averageRating || 0} readOnly size="small" precision={0.5} />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      ({material.ratingCount || 0})
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    By {material.uploadedBy?.name || "Unknown"} •{" "}
                    {material.createdAt ? new Date(material.createdAt).toLocaleDateString() : "N/A"}
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    fullWidth
                    onClick={() => handleDownload(material._id, material.filename)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleOpenRate(material)}
                  >
                    Rate
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && filteredMaterials.length > visibleCount && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Button variant="outlined" onClick={() => setVisibleCount((c) => c + 9)}>
            Load More
          </Button>
        </Box>
      )}

      {/* RATING DIALOG */}
      <Dialog open={rateOpen} onClose={() => setRateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Rate this material
          <IconButton
            onClick={() => setRateOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" gutterBottom>Your Rating</Typography>
              <Rating
                value={ratingValue}
                precision={1}
                onChange={(_, val) => setRatingValue(val || 0)}
                size="large"
              />
            </Box>
            <TextField
              label="Comment (optional)"
              multiline
              minRows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitFeedback}
            disabled={ratingValue <= 0}
          >
            Submit Rating
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Edit Material
          <IconButton
            onClick={() => setEditOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={editData.title}
              onChange={(e) => handleEditChange("title", e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editData.description}
              onChange={(e) => handleEditChange("description", e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Subject</InputLabel>
              <Select
                value={editData.subject}
                label="Subject"
                onChange={(e) => handleEditChange("subject", e.target.value)}
              >
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
                <MenuItem value="Chemistry">Chemistry</MenuItem>
                <MenuItem value="Computer Science">Computer Science</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Business">Business</MenuItem>
                <MenuItem value="Literature">Literature</MenuItem>
                <MenuItem value="History">History</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Semester</InputLabel>
              <Select
                value={editData.semester}
                label="Semester"
                onChange={(e) => handleEditChange("semester", e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitEdit}
            disabled={!editData.title || !editData.subject || !editData.semester}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{materialToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ width: "100%" }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Materials;

// import React, { useState, useEffect } from "react";
// import {
//   Container,
//   Typography,
//   Box,
//   Card,
//   CardContent,
//   Grid,
//   TextField,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Chip,
//   Button,
//   // CircularProgress,
//   Rating,
//   Paper,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Snackbar,
//   Alert,
//   Skeleton,
// } from "@mui/material";
// import { Search, Download, SearchOff } from "@mui/icons-material";

// const Materials = () => {
//   const [materials, setMaterials] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterSubject, setFilterSubject] = useState("");
//   const [filterSemester, setFilterSemester] = useState("");
//   const [visibleCount, setVisibleCount] = useState(9);

//   const [rateOpen, setRateOpen] = useState(false);
//   const [selectedMaterial, setSelectedMaterial] = useState(null);
//   const [ratingValue, setRatingValue] = useState(0);
//   const [comment, setComment] = useState("");
//   const [snackbar, setSnackbar] = useState({
//     open: false,
//     message: "",
//     severity: "success",
//   });
//   const API = process.env.REACT_APP_API_URL || "";

//   useEffect(() => {
//     fetchMaterials();
//     setVisibleCount(9);
//   }, [searchTerm, filterSemester]);

//   const fetchMaterials = async () => {
//     setLoading(true);
//     try {
//       const params = new URLSearchParams();
//       if (searchTerm) params.append("search", searchTerm);
//       if (filterSemester) params.append("semester", filterSemester);
//       const url = `${API}/api/materials?${params.toString()}`;
//       console.log("Fetching materials from:", url);
//       const res = await fetch(url, { credentials: "include" });
//       const data = await res.json();

//       if (!res.ok) throw new Error(data.message || "Failed to fetch materials");

//       // Normalize API data shape to UI expectations
//       const normalized = (data?.data || []).map((m) => ({
//         _id: m.id,
//         title: m.title,
//         description: m.description || "",
//         subject: m.subject,
//         semester: m.semester,
//         averageRating: m.averageRating || 0,
//         ratingCount: m.totalRatings || 0,
//         uploadedBy: { name: m.uploader?.name || "" },
//         createdAt: m.uploadDate,
//         filename: m.fileName,
//       }));
//       setMaterials(normalized);
//     } catch (err) {
//       console.error("Failed to fetch materials:", err);
//       setMaterials([]); // fallback
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredMaterials = (materials || []).filter((material) => {
//     const matchesSearch =
//       material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (material.description || "").toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesSubject = !filterSubject || material.subject === filterSubject;
//     const matchesSemester =
//       !filterSemester || String(material.semester) === String(filterSemester);

//     return matchesSearch && matchesSubject && matchesSemester;
//   });

//   const handleDownload = async (materialId, filename) => {
//     try {
//       const res = await fetch(`${API}/api/materials/${materialId}/download`);
//       if (!res.ok) throw new Error("Download failed");
//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.setAttribute("download", filename);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//     } catch (err) {
//       console.error("Download failed:", err);
//     }
//   };

//   const handleOpenRate = (material) => {
//     setSelectedMaterial(material);
//     setRatingValue(0);
//     setComment("");
//     setRateOpen(true);
//   };

//   const handleSubmitFeedback = async () => {
//     if (!selectedMaterial) return;
//     try {
//       const res = await fetch(
//         `${API}/api/materials/${selectedMaterial._id}/rate`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({ rating: ratingValue, comment }),
//         }
//       );
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message || "Failed to submit feedback");
//       setSnackbar({
//         open: true,
//         message: "Feedback submitted",
//         severity: "success",
//       });
//       setRateOpen(false);
//       fetchMaterials();
//     } catch (err) {
//       setSnackbar({
//         open: true,
//         message: err.message || "Failed to submit feedback",
//         severity: "error",
//       });
//     }
//   };

//   return (
//     <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
//       <Typography variant="h4" component="h1" gutterBottom>
//         Study Materials
//       </Typography>
//       <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
//         Discover and download study materials shared by the EduShare community.
//       </Typography>

//       <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
//         <Grid container spacing={{ xs: 2, sm: 2, md: 2 }} alignItems="center">
//           <Grid item xs={12} md={4}>
//             <TextField
//               fullWidth
//               label="Search materials..."
//               variant="outlined"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               inputProps={{ "aria-label": "Search materials" }}
//               InputProps={{
//                 startAdornment: (
//                   <Search sx={{ mr: 1, color: "text.secondary" }} />
//                 ),
//               }}
//             />
//           </Grid>
//           <Grid item xs={12} md={3}>
//             <FormControl fullWidth>
//               <InputLabel>Subject</InputLabel>
//               <Select
//                 value={filterSubject}
//                 label="Subject"
//                 onChange={(e) => setFilterSubject(e.target.value)}
//               >
//                 <MenuItem value="">All Subjects</MenuItem>
//                 <MenuItem value="Mathematics">Mathematics</MenuItem>
//                 <MenuItem value="Physics">Physics</MenuItem>
//                 <MenuItem value="Chemistry">Chemistry</MenuItem>
//                 <MenuItem value="Computer Science">Computer Science</MenuItem>
//                 <MenuItem value="Engineering">Engineering</MenuItem>
//                 <MenuItem value="Business">Business</MenuItem>
//                 <MenuItem value="Literature">Literature</MenuItem>
//                 <MenuItem value="History">History</MenuItem>
//                 <MenuItem value="Other">Other</MenuItem>
//               </Select>
//             </FormControl>
//           </Grid>
//           <Grid item xs={12} md={3}>
//             <FormControl fullWidth>
//               <InputLabel>Semester</InputLabel>
//               <Select
//                 value={filterSemester}
//                 label="Semester"
//                 onChange={(e) => setFilterSemester(e.target.value)}
//               >
//                 <MenuItem value="">All Semesters</MenuItem>
//                 <MenuItem value="1">Semester 1</MenuItem>
//                 <MenuItem value="2">Semester 2</MenuItem>
//                 <MenuItem value="3">Semester 3</MenuItem>
//                 <MenuItem value="4">Semester 4</MenuItem>
//                 <MenuItem value="5">Semester 5</MenuItem>
//                 <MenuItem value="6">Semester 6</MenuItem>
//                 <MenuItem value="7">Semester 7</MenuItem>
//                 <MenuItem value="8">Semester 8</MenuItem>
//               </Select>
//             </FormControl>
//           </Grid>
//           <Grid item xs={12} md={2}>
//             <Typography variant="body2" color="text.secondary">
//               {filteredMaterials.length} materials found
//             </Typography>
//           </Grid>
//         </Grid>
//       </Paper>

//       {loading ? (
//         <Grid container spacing={3}>
//           {Array.from({ length: 6 }).map((_, idx) => (
//             <Grid item xs={12} sm={6} md={4} key={idx}>
//               <Skeleton variant="rounded" height={180} animation="wave" />
//             </Grid>
//           ))}
//         </Grid>
//       ) : filteredMaterials.length === 0 ? (
//         <Box sx={{ textAlign: "center", py: 6 }}>
//           <SearchOff sx={{ fontSize: 56, color: "text.secondary" }} />
//           <Typography
//             variant="h6"
//             color="text.secondary"
//             gutterBottom
//             sx={{ mt: 1 }}
//           >
//             No materials found
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             Try adjusting your search criteria or check back later for new
//             uploads.
//           </Typography>
//         </Box>
//       ) : (
//         <Grid container spacing={3}>
//           {filteredMaterials.slice(0, visibleCount).map((material) => (
//             <Grid item xs={12} sm={6} md={4} key={material._id}>
//               <Card
//                 elevation={2}
//                 sx={{
//                   height: "100%",
//                   display: "flex",
//                   flexDirection: "column",
//                 }}
//               >
//                 <CardContent sx={{ flexGrow: 1 }}>
//                   <Typography variant="h6" component="h3" gutterBottom>
//                     {material.title}
//                   </Typography>
//                   <Typography
//                     variant="body2"
//                     color="text.secondary"
//                     sx={{ mb: 2 }}
//                   >
//                     {material.description}
//                   </Typography>
//                   <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
//                     <Chip
//                       label={material.subject}
//                       size="small"
//                       color="primary"
//                     />
//                     <Chip label={`Sem ${material.semester}`} size="small" />
//                   </Box>
//                   <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//                     <Rating
//                       value={material.averageRating || 0}
//                       readOnly
//                       size="small"
//                     />
//                     <Typography variant="caption" sx={{ ml: 1 }}>
//                       ({material.ratingCount || 0} ratings)
//                     </Typography>
//                   </Box>
//                   <Typography variant="caption" color="text.secondary">
//                     By {material.uploadedBy?.name} •{" "}
//                     {material.createdAt ? new Date(material.createdAt).toLocaleDateString() : ""}
//                   </Typography>
//                 </CardContent>
//                 <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
//                   <Button
//                     variant="contained"
//                     startIcon={<Download />}
//                     fullWidth
//                     onClick={() =>
//                       handleDownload(material._id, material.filename)
//                     }
//                     aria-label={`Download ${material.title}`}
//                   >
//                     Download
//                   </Button>
//                   <Button
//                     variant="outlined"
//                     fullWidth
//                     onClick={() => handleOpenRate(material)}
//                     aria-label={`Rate ${material.title}`}
//                   >
//                     Rate
//                   </Button>
//                 </Box>
//               </Card>
//             </Grid>
//           ))}
//         </Grid>
//       )}

//       {!loading && filteredMaterials.length > visibleCount && (
//         <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
//           <Button
//             variant="outlined"
//             onClick={() => setVisibleCount((c) => c + 9)}
//           >
//             Load More
//           </Button>
//         </Box>
//       )}

//       <Dialog
//         open={rateOpen}
//         onClose={() => setRateOpen(false)}
//         fullWidth
//         maxWidth="sm"
//       >
//         <DialogTitle>Rate this material</DialogTitle>
//         <DialogContent>
//           <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
//             <Rating
//               value={ratingValue}
//               precision={1}
//               onChange={(_, val) => setRatingValue(val || 0)}
//               aria-label="Rating"
//             />
//             <TextField
//               label="Comment"
//               multiline
//               minRows={3}
//               value={comment}
//               onChange={(e) => setComment(e.target.value)}
//               fullWidth
//               inputProps={{ "aria-label": "Comment" }}
//             />
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setRateOpen(false)}>Cancel</Button>
//           <Button
//             variant="contained"
//             onClick={handleSubmitFeedback}
//             disabled={ratingValue <= 0}
//           >
//             Submit
//           </Button>
//         </DialogActions>
//       </Dialog>

//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={3000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//       >
//         <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
//           {snackbar.message}
//         </Alert>
//       </Snackbar>
//     </Container>
//   );
// };

// export default Materials;
