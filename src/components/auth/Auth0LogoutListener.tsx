import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";

/**
 * Listens for a custom event dispatched from Navbar when the user signed in via Auth0
 * so we can clear the Auth0 session (RP-initiated logout).
 */
export function Auth0LogoutListener() {
  const { logout } = useAuth0();

  useEffect(() => {
    const onLogout = () => {
      logout({
        logoutParams: {
          returnTo: `${window.location.origin}/login`,
        },
      });
    };
    window.addEventListener("auth0:logout", onLogout);
    return () => window.removeEventListener("auth0:logout", onLogout);
  }, [logout]);

  return null;
}
