import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";

/**
 * OAuth returns to /agent/callback; after token exchange the app always opens /agent.
 * Add `https://your-app/agent/callback` to Auth0 Allowed Callback URLs.
 */
export function AgentAuth0LoginButton() {
  const { loginWithRedirect } = useAuth0();

  const handleClick = () => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/agent/callback`,
        ...(audience ? { audience } : {}),
      },
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-emerald-600/40 hover:bg-emerald-500/10"
      onClick={handleClick}
    >
      Continue with Auth0
    </Button>
  );
}
