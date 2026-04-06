import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exchangeTokenVaultToken } from "@/api/auth";
import { getAuthToken } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

type Props = {
  /** True once the user has signed in with Auth0 at least once (auth0Id on profile). */
  hasAuth0Linked: boolean;
};

/**
 * Auth0 Token Vault: exchange Auth0 user tokens for third-party API tokens (e.g. Google, Slack)
 * after Connected Accounts are configured in the Auth0 dashboard.
 */
export function TokenVaultProfileSection({ hasAuth0Linked }: Props) {
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();
  const [connection, setConnection] = useState("google-oauth2");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const runExchange = async () => {
    if (!hasAuth0Linked) {
      toast({
        title: "Auth0 required",
        description:
          "Sign out and sign in with Auth0 once so your account is linked. Then configure Connected Accounts in Auth0.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPreview(null);
    try {
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
      const auth0AccessToken = await getAccessTokenSilently(
        audience ? { authorizationParams: { audience } } : undefined
      );
      const appJwt = getAuthToken();
      if (!appJwt) {
        throw new Error("Not signed in");
      }

      const data = await exchangeTokenVaultToken(appJwt, auth0AccessToken, connection);
      if ("status" in data && data.status === "error") {
        throw new Error(data.message || "Exchange failed");
      }
      setPreview(JSON.stringify((data as { result?: unknown }).result ?? data, null, 2));
      toast({
        title: "Token exchange completed",
        description: "Check the response preview below (tokens may be truncated in logs).",
      });
    } catch (e: unknown) {
      toast({
        title: "Token Vault",
        description: e instanceof Error ? e.message : "Exchange failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Auth0 Token Vault (AI agents)</CardTitle>
            <CardDescription>
              Exchange your Auth0 session for third-party API tokens after you enable Token Vault and
              Connected Accounts in the Auth0 dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAuth0Linked ? (
          <p className="text-sm text-muted-foreground">
            Your account is not linked to Auth0 yet. Use &quot;Continue with Auth0&quot; on the login
            or register page, then return here to test token exchange for your bots and agents.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connection name must match a provider configured for Token Vault (for example{" "}
            <code className="text-xs bg-muted px-1 rounded">google-oauth2</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">slack</code>).
          </p>
        )}

        <div className="space-y-2 max-w-md">
          <Label htmlFor="tv-connection">Connection</Label>
          <Input
            id="tv-connection"
            value={connection}
            onChange={(e) => setConnection(e.target.value)}
            placeholder="google-oauth2"
          />
        </div>

        <Button type="button" onClick={runExchange} disabled={loading}>
          {loading ? "Exchanging…" : "Test token exchange"}
        </Button>

        {preview && (
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48">{preview}</pre>
        )}
      </CardContent>
    </Card>
  );
}
