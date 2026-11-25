import { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const API = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    fetchUserMaterials();
  }, []);

 const fetchUserMaterials = async () => {
  try {
    const res = await fetch(`${API}/api/materials/my-uploads`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("Unauthorized — user session expired.");
      }
      throw new Error(data.message || "Failed to fetch materials");
    }

    setMaterials(data?.data || []);
  } catch (err) {
    console.error("Failed to fetch materials:", err);
    setMaterials([]); // prevent null reference errors
  } finally {
    setLoading(false);
  }
};


  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage your uploaded materials and track your contributions to the EduShare community.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/upload")}
          sx={{ mb: 3 }}
        >
          Upload New Material
        </Button>
      </Box>

      <Typography variant="h5" component="h2" gutterBottom>
        Your Materials ({materials.length})
      </Typography>

      {materials.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No materials uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start sharing your study materials with the EduShare community.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/upload")}>
              Upload Your First Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {materials.map((material) => (
            <Grid item xs={12} sm={6} md={4} key={material._id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {material.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {material.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <Chip label={material.subject} size="small" color="primary" />
                    <Chip label={`Sem ${material.semester}`} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Uploaded: {new Date(material.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;
