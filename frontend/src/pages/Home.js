import React from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      title: "Share Study Materials",
      description: "Upload and share notes, question papers, and study resources with fellow students.",
    },
    {
      title: "Access Quality Content",
      description: "Browse through verified study materials uploaded by students and educators.",
    },
    {
      title: "Rate & Review",
      description: "Help the community by rating materials and providing feedback.",
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to EduShare
          </Typography>
          <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9 }}>
            The ultimate platform for students to share and discover study materials
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              variant="contained"
              size="large"
              sx={{ bgcolor: "white", color: "primary.main" }}
              onClick={() => navigate("/materials")}
            >
              Browse Materials
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: "white", color: "white" }}
              onClick={() => navigate("/register")}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Why Choose EduShare?
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card elevation={2} sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          py: 6,
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Start Sharing?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of students who are already sharing and discovering
            amazing study materials.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/register")}
          >
            Join EduShare Today
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
