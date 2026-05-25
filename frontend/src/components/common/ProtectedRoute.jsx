import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useSelector((s) => s.auth);
  if (!isInitialized) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
