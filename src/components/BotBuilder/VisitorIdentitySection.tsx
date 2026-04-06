import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  botConfig: { requireVisitorAuth0Identity?: boolean };
  updateConfig: (field: string, value: unknown) => void;
};

export function VisitorIdentitySection({ botConfig, updateConfig }: Props) {
  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Shield className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Visitor identity (Auth0)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            When enabled, anyone who opens this bot on your site, embed, or public link must sign in
            with Auth0 before they can chat. Their identity is attached to the session for your
            records.
          </p>
        </div>
      </div>

      {!auth0Configured && (
        <Alert>
          <AlertDescription>
            Configure <code className="text-xs">VITE_AUTH0_DOMAIN</code> and{" "}
            <code className="text-xs">VITE_AUTH0_CLIENT_ID</code> in the app so visitors can sign in.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4 gap-4">
        <div className="space-y-1">
          <Label htmlFor="require-visitor-auth0" className="text-base">
            Require Auth0 sign-in for visitors
          </Label>
          <p className="text-sm text-muted-foreground">
            Show an identity screen before the chat UI. Recommended for bots that handle sensitive
            topics or compliance.
          </p>
        </div>
        <Switch
          id="require-visitor-auth0"
          checked={!!botConfig.requireVisitorAuth0Identity}
          onCheckedChange={(v) => updateConfig("requireVisitorAuth0Identity", v)}
          disabled={!auth0Configured}
        />
      </div>
    </div>
  );
}
