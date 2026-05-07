import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Mail, ShieldCheck } from "lucide-react";

export function VisitorIdentitySection({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <Label htmlFor="visitorEmailOtp" className="text-base font-medium cursor-pointer">
              Require visitor email verification (OTP)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, visitors must verify their email to chat on Public, Test, and Embed.
            </p>
          </div>
        </div>
        <Switch
          id="visitorEmailOtp"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      <Alert className="bg-card">
        <Info className="h-4 w-4" />
        <AlertDescription>
          If a visitor verifies once, we remember it for the same device and IP so they are not asked again on every visit.
        </AlertDescription>
      </Alert>

      {enabled && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md p-2 bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">What visitors will see</p>
              <ul className="mt-1 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Enter email</li>
                <li>Receive a 6-digit OTP on email</li>
                <li>Verify OTP to start chatting</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
