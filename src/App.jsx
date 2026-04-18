import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Patients from "./pages/Patients";
import Charts from "./pages/Charts";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/charts" element={<Charts />} />

      </Routes>
    </BrowserRouter>
  );
}