// src/context/AuthContext.js
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const API = process.env.REACT_APP_API_URL || "";

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // Check active session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data?.data?.user) {
          setUser(data.data.user);
          localStorage.setItem("user", JSON.stringify(data.data.user));
        } else {
          handleLogout();
        }
      } catch (err) {
        handleLogout();
      }
    };
    checkSession();
  }, [API]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    handleLogout();
    // Optional: call backend logout endpoint
    fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
