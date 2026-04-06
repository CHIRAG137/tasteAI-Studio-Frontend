import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  setAgentAuthToken,
  setAgentEmail,
  setAgentLoginProvider,
} from "@/utils/agentAuth";

const AgentAuthCallback = () => {
  const { isLoading, isAuthenticated, getAccessTokenSilently, error } =
    useAuth0();
  const navigate = useNavigate();
  const done = useRef(false);
  const [message, setMessage] = useState("Completing agent sign-in…");

  useEffect(() => {
    if (isLoading) return;

    if (error) {
      setMessage(error.message || "Auth0 error");
      return;
    }

    if (!isAuthenticated) {
      navigate("/agent/login", { replace: true });
      return;
    }

    if (done.current) return;
    done.current = true;

    (async () => {
      try {
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
        const accessToken = await getAccessTokenSilently(
          audience ? { authorizationParams: { audience } } : undefined
        );

        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/human-agent/auth0-login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.message || data.error || "Could not complete agent sign-in"
          );
        }

        const token = data.result?.token as string | undefined;
        const agent = data.result?.agent as { id?: string; email?: string } | undefined;
        if (!token || !agent?.email) {
          throw new Error("Invalid response from server");
        }

        setAgentAuthToken(token);
        setAgentEmail(agent.email);
        if (agent.id) localStorage.setItem("agentId", agent.id);
        setAgentLoginProvider("auth0");

        sessionStorage.removeItem("agent_auth0_returnTo");
        navigate("/agent", { replace: true });
      } catch (e: unknown) {
        done.current = false;
        setMessage(e instanceof Error ? e.message : "Sign-in failed");
      }
    })();
  }, [isLoading, isAuthenticated, error, getAccessTokenSilently, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-4">
      <p className="text-muted-foreground text-center text-sm">{message}</p>
    </div>
  );
};

export default AgentAuthCallback;
