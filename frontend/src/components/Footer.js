import React from "react";
import { Container, Grid, Typography, Link } from "@mui/material";

const Footer = () => {
  return (
    <Container component="footer" sx={{ py: 4, mt: 6, borderTop: 1, borderColor: "divider" }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} EduShare — All rights reserved.
          </Typography>
        </Grid>
        <Grid item xs={12} md={6} sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Link href="/about" underline="hover" sx={{ mx: 1 }} aria-label="About EduShare">About</Link>
          <Link href="/contact" underline="hover" sx={{ mx: 1 }} aria-label="Contact EduShare">Contact</Link>
          <Link href="/privacy" underline="hover" sx={{ mx: 1 }} aria-label="Privacy policy">Privacy</Link>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Footer;
