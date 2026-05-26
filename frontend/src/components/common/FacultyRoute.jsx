import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function FacultyRoute() {
  const { isAuthenticated, isInitialized, user } = useSelector((s) => s.auth);
  if (!isInitialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Allow faculty, admin, and super_admin roles
  const allowedRoles = ["faculty", "admin", "super_admin"];
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
