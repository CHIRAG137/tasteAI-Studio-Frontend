import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth0LoginUser } from "@/api/auth";
import { setAuthToken, setLoginProvider, ensureLoginDeviceId } from "@/utils/auth";
import { BrandLoader } from "@/components/BrandLoader";
import { parseRateLimitError, setRateLimitByKey } from "@/utils/rateLimit";

const AuthCallback = () => {
  const { isLoading, isAuthenticated, getAccessTokenSilently, error } =
    useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const done = useRef(false);
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    if (isLoading) return;

    if (error) {
      setMessage(error.message || "Auth0 error");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (done.current) return;
    done.current = true;

    (async () => {
      try {
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
        const accessToken = await getAccessTokenSilently(
          audience
            ? { authorizationParams: { audience } }
            : undefined
        );

        const deviceId = ensureLoginDeviceId();
        const data = await auth0LoginUser(accessToken, deviceId);
        if (data.status !== "success") {
          throw new Error(
            data.message || data.error || "Could not complete sign-in"
          );
        }

        const token = data.result?.token as string | undefined;
        if (!token) {
          throw new Error("No session token returned from server");
        }

        setAuthToken(token);
        setLoginProvider("auth0");
        
        // Get returnTo from Auth0 appState or fallback to sessionStorage, then "/"
        const returnTo =
          (location.state as any)?.returnTo ||
          sessionStorage.getItem("auth0_returnTo") ||
          "/";
        sessionStorage.removeItem("auth0_returnTo");
        navigate(returnTo, { replace: true });
      } catch (e: unknown) {
        done.current = false;
        const message = e instanceof Error ? e.message : "Sign-in failed";
        const rateLimitError = parseRateLimitError({ message });
        if (rateLimitError) {
          setRateLimitByKey("auth_global", rateLimitError.retryAfter);
        }
        setMessage(message);
      }
    })();
  }, [isLoading, isAuthenticated, error, getAccessTokenSilently, navigate]);

  return (
    <BrandLoader label={message} />
  );
};

export default AuthCallback;
