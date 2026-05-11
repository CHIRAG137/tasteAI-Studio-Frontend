import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ensureLoginDeviceId } from "@/utils/auth";
import { saveVisitorEmailVerification } from "@/utils/visitorEmailOtp";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

export function VisitorEmailOtpGate({
  botId,
  open,
  onVerified,
}: {
  botId: string;
  open: boolean;
  onVerified: () => void;
}) {
  const { toast } = useToast();
  const deviceId = useMemo(() => ensureLoginDeviceId(), []);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("email");
    setOtp("");
    setIsLoading(false);
  }, [open]);

  const canResend = !cooldownUntil || Date.now() > cooldownUntil;

  const requestOtp = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/visitor-auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, email, deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send OTP");
      setStep("otp");
      setCooldownUntil(Date.now() + 30_000);
      toast({ title: "OTP sent", description: "Check your inbox for a 6-digit code." });
    } catch (e) {
      toast({ title: "Could not send OTP", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast({ title: "Code required", description: "Please enter the OTP.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/visitor-auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, email, deviceId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to verify OTP");
      const token = data?.result?.token;
      const verifiedEmail = data?.result?.email || email;
      if (!token) throw new Error("Verification token missing");

      saveVisitorEmailVerification(botId, token, verifiedEmail);
      window.dispatchEvent(new CustomEvent("visitor-auth-ready", { detail: { botId } }));
      toast({ title: "Verified", description: "You can now chat with this bot." });
      onVerified();
    } catch (e) {
      toast({ title: "Verification failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} modal={true}>
      <DialogContent
        className="w-[calc(100%-2rem)] sm:w-full max-w-md sm:max-w-md rounded-xl p-6"
        style={{ zIndex: 9999 }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verify your email to continue
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-muted/30">
          <Mail className="h-4 w-4" />
          <AlertDescription>
            This bot requires a one-time email verification. We remember verification for the same device and IP.
          </AlertDescription>
        </Alert>

        {step === "email" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="visitor-email">Email</Label>
              <Input
                id="visitor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <Button onClick={requestOtp} disabled={isLoading} className="w-full gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="visitor-otp">6-digit code</Label>
              <Input
                id="visitor-otp"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
              />
              <p className="text-xs text-muted-foreground">Sent to {email}</p>
            </div>
            <Button onClick={verifyOtp} disabled={isLoading} className="w-full gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verify & Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={requestOtp}
              disabled={isLoading || !canResend}
            >
              Resend OTP
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

