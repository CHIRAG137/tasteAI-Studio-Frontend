import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { RateLimitedButton } from "@/components/RateLimitedButton";
import { useRateLimit } from "@/hooks/useRateLimit";
import { toast } from "sonner";

type Props = {
  mode?: "login" | "register";
  badgeText?: string;
};

export function Auth0LoginButton({ mode = "login", badgeText }: Props) {
  const { loginWithRedirect } = useAuth0();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const auth0RateLimit = useRateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    key: "auth0_auth",
  });
  const globalAuthRateLimit = useRateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    key: "auth_global",
  });
  const isButtonDisabled = loading || !auth0RateLimit.canMakeRequest || !globalAuthRateLimit.canMakeRequest;
  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const handleClick = async () => {
    setLoading(true);
    sessionStorage.setItem("auth0_returnTo", from);
    try {
      await loginWithRedirect({
        authorizationParams: {
          ...(mode === "register" ? { screen_hint: "signup" } : {}),
        },
      });
    } catch (error) {
      console.error("Auth0 redirect error:", error);
      toast.error("Auth0 login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-full">
      {badgeText && (
        <span
          className={`
        absolute -top-2 -right-2
        bg-white
        ${isButtonDisabled ? "text-black/60 border-gray-300 bg-white" : "text-black border-gradient-to-r from-purple-600 to-cyan-500 bg-white"}
        text-[10px] font-semibold
        px-2.5 py-1
        rounded-full
        border
        shadow-sm
      `}
        >
          {badgeText}
        </span>
      )}

      <RateLimitedButton
        rateLimitKey="auth0_auth"
        maxRequests={10}
        windowMs={15 * 60 * 1000}
        countdownMessage="Too many authentication attempts. Try again in"
        showCountdown={false}
        className="
      w-full
      bg-gradient-to-r from-purple-600 to-cyan-500
      hover:from-purple-700 hover:to-cyan-600
      text-white
      font-medium
      py-3
      shadow-md
    "
        disabled={isButtonDisabled}
        onClick={handleClick}
      >
        {loading ? "Loading..." : mode === "register" ? "Sign Up with Auth0" : "Sign In with Auth0"}
      </RateLimitedButton>
    </div>
  );
}
