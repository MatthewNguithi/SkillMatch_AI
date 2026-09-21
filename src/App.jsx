import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./frontend/components/NavBar";
import HomePage from "./frontend/pages/HomePage";
import StudentPage from "./frontend/pages/StudentPage";
import EmployerPage from "./frontend/pages/EmployerPage";
import LoginPage from "./frontend/pages/LoginPage";
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}