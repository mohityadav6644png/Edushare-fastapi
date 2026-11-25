import React from "react";
import { Container, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const NotFound = () => (
  <Container sx={{ textAlign: "center", mt: 10 }}>
    <Typography variant="h3">404 - Page Not Found</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>The page you’re looking for doesn’t exist.</Typography>
    <Button component={Link} to="/" variant="contained" sx={{ mt: 3 }}>
      Back to Home
    </Button>
  </Container>
);

export default NotFound;
