import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function VisitorIdentitySection() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Auth0 visitor authentication is disabled. Public bots do not require visitor sign-in.
        </AlertDescription>
      </Alert>
    </div>
  );
}
