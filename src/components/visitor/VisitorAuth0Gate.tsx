import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import {
  saveVisitorIdentity,
  clearVisitorIdentity,
} from "@/utils/visitorIdentity";

type Props = {
  botId: string;
  /** When false, children render with no Auth0 check */
  enabled: boolean;
  children: React.ReactNode;
};

function VisitorAuth0GateInner({ botId, children }: { botId: string; children: React.ReactNode }) {
  const { isAuthenticated, user, loginWithRedirect, logout, isLoading } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      saveVisitorIdentity(botId, {
        sub: user.sub,
        email: user.email,
        name: user.name,
      });
      window.dispatchEvent(
        new CustomEvent("visitor-auth-ready", { detail: { botId } })
      );
    }
  }, [isAuthenticated, user, botId]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground text-sm">
        Checking identity…
      </div>
    );
  }

  if (!isAuthenticated || !user?.sub) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[360px] p-6 gap-4 text-center">
        <Shield className="h-14 w-14 text-violet-500" />
        <h2 className="text-lg font-semibold">Verify your identity</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This assistant is configured to only chat with signed-in visitors. Continue with Auth0 to
          share your identity securely, then you can use the bot.
        </p>
        <Button
          className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
          onClick={() => {
            const returnUrl = `${window.location.pathname}${window.location.search}`;
            sessionStorage.setItem("auth0_returnTo", returnUrl);
            loginWithRedirect({
              appState: {
                returnTo: returnUrl,
              },
            });
          }}
        >
          Continue with Auth0
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-violet-500/10 text-xs sm:text-sm border-b border-violet-500/20 shrink-0">
        <span className="truncate text-muted-foreground">
          Visitor: <span className="font-medium text-foreground">{user.email || user.sub}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8"
          onClick={() => {
            clearVisitorIdentity(botId);
            logout({ logoutParams: { returnTo: window.location.href } });
          }}
        >
          Switch account
        </Button>
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function VisitorAuth0Gate({ botId, enabled, children }: Props) {
  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  if (!enabled) {
    return <>{children}</>;
  }

  if (!auth0Configured) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground max-w-md mx-auto">
        This bot requires visitor sign-in, but Auth0 is not configured (set VITE_AUTH0_DOMAIN and
        VITE_AUTH0_CLIENT_ID in the app environment).
      </div>
    );
  }

  return <VisitorAuth0GateInner botId={botId}>{children}</VisitorAuth0GateInner>;
}
