import { Navigate, useLocation } from "react-router-dom";
import { isAgentAuthenticated } from "@/utils/agentAuth";

interface AgentProtectedRouteProps {
  children: React.ReactNode;
}

export const AgentProtectedRoute = ({ children }: AgentProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = isAgentAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/agent/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
