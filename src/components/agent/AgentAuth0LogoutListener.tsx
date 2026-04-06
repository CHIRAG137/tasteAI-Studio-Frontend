import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";

/**
 * Clears the Auth0 session when the agent dashboard dispatches `agent-auth0:logout`
 * after revoking the app JWT on the server.
 */
export function AgentAuth0LogoutListener() {
  const { logout } = useAuth0();

  useEffect(() => {
    const onLogout = () => {
      logout({
        logoutParams: {
          returnTo: `${window.location.origin}/agent/login`,
        },
      });
    };
    window.addEventListener("agent-auth0:logout", onLogout);
    return () => window.removeEventListener("agent-auth0:logout", onLogout);
  }, [logout]);

  return null;
}
