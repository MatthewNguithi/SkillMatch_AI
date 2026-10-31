import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./frontend/components/NavBar";
import HomePage from "./frontend/pages/HomePage";
import StudentPage from "./frontend/pages/StudentPage";
import AdminPage from "./frontend/pages/AdminPage";
import EmployerPage from "./frontend/pages/EmployerPage";
import LoginPage from "./frontend/pages/LoginPage";
import RegistrationPage from "./frontend/pages/Registration/RegistrationPage";
import SavedMatchesPage from "./frontend/pages/SavedMatchesPages";
import "./frontend/pages/Registration/RegistrationPage"
import "./frontend/styles/global.css";


export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <NavBar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/employer" element={<EmployerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegistrationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/saved-matches" element={<SavedMatchesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}