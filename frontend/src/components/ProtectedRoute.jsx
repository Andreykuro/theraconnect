import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ParentStatusGate from "./ParentStatusGate";

export default function ProtectedRoute({ roles, children }) {
  const { user, clientStatus, clientStatusLoading } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  // Parent accounts only get the real dashboard once their child's
  // registration is 'active' - pending/rejected sees a status screen
  // instead, everywhere under /parent/*.
  if (user.role === "parent") {
    if (clientStatusLoading) {
      return <div className="flex min-h-screen items-center justify-center bg-chalk" />;
    }
    if (clientStatus && clientStatus.status !== "active") {
      return (
        <ParentStatusGate
          status={clientStatus.status}
          rejectionReason={clientStatus.rejection_reason}
          clientName={clientStatus.client_name}
        />
      );
    }
  }

  return children;
}
