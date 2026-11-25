import React, { useContext } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider
} from "@mui/material";
import { AccountCircle, Brightness4, Brightness7, Menu as MenuIcon } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = ({ mode, setMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    handleClose();
  };

  const handleProfile = () => {
    navigate("/profile");
    handleClose();
  };

  const isActive = (path) => location.pathname === path;

  const NavButtons = () => (
    <>
      <Button
        color="inherit"
        onClick={() => navigate("/")}
        aria-label="Go to Home"
        sx={{ fontWeight: isActive("/") ? 700 : 500, textDecoration: isActive("/") ? "underline" : "none" }}
      >
        Home
      </Button>
      <Button
        color="inherit"
        onClick={() => navigate("/materials")}
        aria-label="Browse materials"
        sx={{ fontWeight: isActive("/materials") ? 700 : 500, textDecoration: isActive("/materials") ? "underline" : "none" }}
      >
        Materials
      </Button>
      {user && (
        <Button
          color="inherit"
          onClick={() => navigate("/upload")}
          aria-label="Upload material"
          sx={{ fontWeight: isActive("/upload") ? 700 : 500, textDecoration: isActive("/upload") ? "underline" : "none" }}
        >
          Upload
        </Button>
      )}
    </>
  );

  const DrawerContent = () => (
    <Box
      role="presentation"
      sx={{ width: 260, p: 2 }}
      onClick={() => setDrawerOpen(false)}
      onKeyDown={() => setDrawerOpen(false)}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        EduShare
      </Typography>
      <Divider />
      <List>
        <ListItemButton selected={isActive("/")} onClick={() => navigate("/")}> 
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton selected={isActive("/materials")} onClick={() => navigate("/materials")}>
          <ListItemText primary="Materials" />
        </ListItemButton>
        {user && (
          <ListItemButton selected={isActive("/upload")} onClick={() => navigate("/upload")}>
            <ListItemText primary="Upload" />
          </ListItemButton>
        )}
      </List>
      <Divider />
      {user ? (
        <List>
          <ListItemButton onClick={handleProfile}>
            <ListItemText primary="Profile" />
          </ListItemButton>
          {user.role === "admin" && (
            <ListItemButton onClick={() => navigate("/admin")}>
              <ListItemText primary="Admin Dashboard" />
            </ListItemButton>
          )}
          <ListItemButton onClick={handleLogout}>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      ) : (
        <List>
          <ListItemButton onClick={() => navigate("/login")}>
            <ListItemText primary="Login" />
          </ListItemButton>
          <ListItemButton onClick={() => navigate("/register")}>
            <ListItemText primary="Register" />
          </ListItemButton>
        </List>
      )}
    </Box>
  );

  return (
    <AppBar position="static" elevation={0} component="header">
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, cursor: "pointer" }}
          onClick={() => navigate("/")}
          aria-label="EduShare Home"
        >
          EduShare
        </Typography>

        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
          <NavButtons />
        </Box>

        <IconButton
          onClick={() => setMode(mode === "light" ? "dark" : "light")}
          color="inherit"
          aria-label="Toggle color mode"
        >
          {mode === "light" ? <Brightness4 /> : <Brightness7 />}
        </IconButton>

        {user ? (
          <>
            <IconButton
              size="large"
              aria-label="Open profile menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>Profile</MenuItem>
              {user.role === "admin" && (
                <MenuItem onClick={() => navigate("/admin")}>Admin Dashboard</MenuItem>
              )}
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
            <Button color="inherit" onClick={() => navigate("/login")} aria-label="Login">
              Login
            </Button>
            <Button color="inherit" onClick={() => navigate("/register")} aria-label="Register">
              Register
            </Button>
          </Box>
        )}

        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <DrawerContent />
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
