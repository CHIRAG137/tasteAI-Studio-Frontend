import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

type Props = { mode?: "login" | "register" };

export function Auth0LoginButton({ mode = "login" }: Props) {
  const { loginWithRedirect } = useAuth0();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const handleClick = () => {
    sessionStorage.setItem("auth0_returnTo", from);
    loginWithRedirect({
      authorizationParams: {
        ...(mode === "register" ? { screen_hint: "signup" } : {}),
      },
    });
  };

  return (
    <Button
      type="button"
      className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
      onClick={handleClick}
    >
      {mode === "register" ? "Sign Up with Auth0" : "Sign In with Auth0"}
    </Button>
  );
}
