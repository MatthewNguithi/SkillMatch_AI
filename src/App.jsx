import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./frontend/components/NavBar";
import HomePage from "./frontend/pages/HomePage";
import StudentPage from "./frontend/pages/StudentPage";
import AdminPage from "./frontend/pages/AdminPage";
import EmployerPage from "./frontend/pages/EmployerPage";
import LoginPage from "./frontend/pages/LoginPage";
import InboxPage from "./frontend/pages/InboxPage";
import RegistrationPage from "./frontend/pages/Registration/RegistrationPage";
import SavedMatchesPage from "./frontend/pages/SavedMatchesPages";
import { ProtectedRoute, GuestRoute } from "./frontend/components/ProtectedRoute";
import "./frontend/styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <NavBar />

        <main className="main-content">
          <Routes>
            {/* Public Route */}
            <Route path="/" element={<HomePage />} />

            {/* Guest-Only Routes (Redirects authenticated users to their dashboard) */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<RegistrationPage />} />
            </Route>

            {/* Student-Only Route */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student" element={<StudentPage />} />
            </Route>

            {/* Employer-Only Route */}
            <Route element={<ProtectedRoute allowedRoles={["employer"]} />}>
              <Route path="/employer" element={<EmployerPage />} />
            </Route>

            {/* Admin-Only Route */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Authenticated Routes Shared Across Roles */}
            <Route element={<ProtectedRoute allowedRoles={["student", "employer", "admin"]} />}>
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/saved-matches" element={<SavedMatchesPage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}