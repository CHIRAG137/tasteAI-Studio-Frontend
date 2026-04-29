import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

type Props = {
  mode?: "login" | "register";
  badgeText?: string;
};

export function Auth0LoginButton({ mode = "login", badgeText }: Props) {
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
    <div className="relative inline-block w-full">
      {badgeText && (
        <span
          className="
        absolute -top-2 -right-2
        bg-white
        text-black
        text-[10px] font-semibold
        px-2.5 py-1
        rounded-full
        border border-gradient-to-r from-purple-600 to-cyan-500
        shadow-sm
      "
        >
          {badgeText}
        </span>
      )}

      <Button
        type="button"
        className="
      w-full
      bg-gradient-to-r from-purple-600 to-cyan-500
      hover:from-purple-700 hover:to-cyan-600
      text-white
      font-medium
      py-3
      shadow-md
    "
        onClick={handleClick}
      >
        {mode === "register" ? "Sign Up with Auth0" : "Sign In with Auth0"}
      </Button>
    </div>
  );
}
