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
    <div className="space-y-4">
      {!auth0Configured && (
        <Alert>
          <AlertDescription>
            Configure <code className="text-xs">VITE_AUTH0_DOMAIN</code> and{" "}
            <code className="text-xs">VITE_AUTH0_CLIENT_ID</code> in the app so visitors can sign in.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="require-visitor-auth0" className="text-base font-medium cursor-pointer">
              Require Auth0 sign-in for visitors
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Show an identity screen before the chat UI. Recommended for bots that handle sensitive topics or compliance.
            </p>
          </div>
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
