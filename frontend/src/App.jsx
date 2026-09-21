import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import PlayHome from "./pages/PlayHome";
import Login from "./pages/Login";
import Enrollment from "./pages/Enrollment";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Clients from "./pages/admin/Clients";
import Announcements from "./pages/admin/Announcements";
import Notifications from "./pages/admin/Notifications";
import Automation from "./pages/admin/Automation";
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import TherapistProgress from "./pages/therapist/TherapistProgress";
import TherapistClasswork from "./pages/therapist/TherapistClasswork";
import TherapistMessages from "./pages/therapist/TherapistMessages";
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentEnrollment from "./pages/parent/ParentEnrollment";
import ParentProgress from "./pages/parent/ParentProgress";
import ParentClasswork from "./pages/parent/ParentClasswork";
import ParentMessages from "./pages/parent/ParentMessages";

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
          <Route path="/play" element={<PlayHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/enroll" element={<Enrollment />} />

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
            path="/admin/automation"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Automation />
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
            path="/therapist/progress"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistProgress />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist/classwork"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistClasswork />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist/messages"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistMessages />
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
          <Route
            path="/parent/enrollment"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentEnrollment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/progress"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentProgress />
              </ProtectedRoute>
            }
          />

          <Route
            path="/parent/classwork"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentClasswork />
              </ProtectedRoute>
            }
          />

          <Route
            path="/parent/messages"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentMessages />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
