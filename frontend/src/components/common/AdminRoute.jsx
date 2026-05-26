import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function AdminRoute() {
  const { isAuthenticated, isInitialized, user } = useSelector((s) => s.auth);
  if (!isInitialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Allow super_admin, admin, and moderator roles
  const adminRoles = ["super_admin", "admin", "moderator"];
  if (!adminRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
