import React from "react";
import { Typography, Container, Button } from "@mui/material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container sx={{ textAlign: "center", mt: 10 }}>
          <Typography variant="h5">Something went wrong 😢</Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Container>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
