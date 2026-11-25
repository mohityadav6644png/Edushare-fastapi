import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Snackbar,
  Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const UploadPage = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    semester: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL || "";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg",
        "image/png",
        "image/gif",
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setSnackbar({ open: true, message: "Please upload a valid file (PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, GIF)", severity: "error" });
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setSnackbar({ open: true, message: "File size must be less than 10MB", severity: "error" });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    if (!file) {
      setSnackbar({ open: true, message: "Please select a file to upload", severity: "error" });
      setLoading(false);
      return;
    }

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("subject", formData.subject);
    fd.append("semester", formData.semester);
    fd.append("description", formData.description);
    fd.append("file", file);

    try {
      const res = await fetch(`${API}/api/materials/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed!");
      setUploadProgress(100);
      setSnackbar({ open: true, message: "Material uploaded successfully!", severity: "success" });
      setFormData({ title: "", subject: "", semester: "", description: "" });
      setFile(null);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Upload failed!", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, width: "100%" }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Upload Study Material
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Share your study materials with the EduShare community
          </Typography>

          <Box component="form" onSubmit={handleUpload} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="title"
              label="Material Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              inputProps={{ "aria-label": "Material Title" }}
            />

            <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
              <FormControl sx={{ minWidth: 180, flex: 1 }}>
                <InputLabel id="subject-label">Subject</InputLabel>
                <Select
                  labelId="subject-label"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  label="Subject"
                  onChange={handleChange}
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

              <FormControl sx={{ minWidth: 180, flex: 1 }}>
                <InputLabel id="semester-label">Semester</InputLabel>
                <Select
                  labelId="semester-label"
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  label="Semester"
                  onChange={handleChange}
                >
                  <MenuItem value="1">Semester 1</MenuItem>
                  <MenuItem value="2">Semester 2</MenuItem>
                  <MenuItem value="3">Semester 3</MenuItem>
                  <MenuItem value="4">Semester 4</MenuItem>
                  <MenuItem value="5">Semester 5</MenuItem>
                  <MenuItem value="6">Semester 6</MenuItem>
                  <MenuItem value="7">Semester 7</MenuItem>
                  <MenuItem value="8">Semester 8</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={4}
              value={formData.description}
              onChange={handleChange}
              inputProps={{ "aria-label": "Description" }}
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Select File (PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, GIF - Max 10MB)
              </Typography>
              <input
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                style={{ display: "none" }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" aria-label="Choose file">
                  Choose File
                </Button>
              </label>
              {file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {file.name}
                </Typography>
              )}
            </Box>

            {loading && (
              <Box sx={{ width: "100%", mb: 2 }}>
                <LinearProgress variant="indeterminate" />
                <Typography variant="body2" color="text.secondary" align="center">
                  Uploading...
                </Typography>
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              aria-label="Upload material"
            >
              {loading ? <CircularProgress size={24} /> : "Upload Material"}
            </Button>
          </Box>
        </Paper>
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

export default UploadPage;
