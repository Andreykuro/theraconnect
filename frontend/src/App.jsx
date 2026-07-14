import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Clients from "./pages/admin/Clients";
import Announcements from "./pages/admin/Announcements";
import Notifications from "./pages/admin/Notifications";
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import ParentDashboard from "./pages/parent/ParentDashboard";

function Root() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clients"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Announcements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/parent"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
