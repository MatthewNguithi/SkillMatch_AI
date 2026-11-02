import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("skillmatch_role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "student") return <Navigate to="/student" replace />;
    if (role === "employer") return <Navigate to="/employer" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("skillmatch_role");

  if (token) {
    if (role === "student") return <Navigate to="/student" replace />;
    if (role === "employer") return <Navigate to="/employer" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}