import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, registerUser, humanAgentLogin } from "@/api/auth";
import { setAuthToken, setLoginProvider, ensureLoginDeviceId } from "@/utils/auth";
import { AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { RateLimitedButton } from "@/components/RateLimitedButton";
import { useRateLimit } from "@/hooks/useRateLimit";
import { extractRetryAfterSeconds } from "@/utils/rateLimit";

type Props = {
  mode: "login" | "register";
  isAgent?: boolean;
  showLastUsedBadge?: boolean;
};

export function EmailPasswordForm({ mode, isAgent = false, showLastUsedBadge = false }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossMethodError, setCrossMethodError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const authRateLimit = useRateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    key: "email_auth"
  });

  const handleFormSubmit = async () => {
    setLoading(true);
    setError(null);
    setCrossMethodError(false);

    try {
      let response;
      const deviceId = ensureLoginDeviceId();
      if (mode === "register") {
        response = await registerUser({ email, password, name, deviceId });
      } else {
        const apiCall = isAgent ? humanAgentLogin : loginUser;
        response = await apiCall({ email, password, deviceId });
      }

      if (response.status === "success") {
        authRateLimit.recordRequest();
        if (mode === "register") {
          toast.success("Registration successful! Please login now.");
          navigate("/login", {
            replace: true,
            state: { message: "Registration successful! Please login with your credentials." }
          });
        } else {
          setAuthToken(response.result.token);
          setLoginProvider("local");
          toast.success("Login successful!");
          navigate(from, { replace: true });
        }
      } else {
        const errorMsg = response.message || `${mode === "register" ? "Registration" : "Login"} failed`;
        setError(errorMsg);
        
        // Check if this is a cross-method error
        if (
          mode === "login" &&
          (errorMsg.includes("Auth0") ||
            errorMsg.includes("Google") ||
            errorMsg.includes("original method"))
        ) {
          setCrossMethodError(true);
        } else if (errorMsg.toLowerCase().includes('too many') || errorMsg.toLowerCase().includes('rate limit')) {
          // Handle rate limit error
          authRateLimit.handleRateLimitError(extractRetryAfterSeconds(errorMsg, 900));
        }
        
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Auth error:", error);
      const errorMsg = error instanceof Error ? error.message : `${mode === "register" ? "Registration" : "Login"} failed`;
      setError(errorMsg);
      
      if (errorMsg.toLowerCase().includes('too many') || errorMsg.toLowerCase().includes('rate limit')) {
        authRateLimit.handleRateLimitError(extractRetryAfterSeconds(errorMsg, 900));
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4">
      {error && (
        <Alert className={crossMethodError ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          {crossMethodError ? (
            <>
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Account linked to Auth0 or Google:</strong> This email is registered with Auth0 or Google. 
                Please use your original login method to access your account.
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
            </>
          )}
        </Alert>
      )}
      {mode === "register" && (
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
          />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          minLength={8}
        />
      </div>
      <div className="relative inline-block w-full">
        {showLastUsedBadge ? (
          <span
            className="
        absolute -top-2 -right-2
        bg-white
        text-black
        text-[10px] font-semibold
        px-2.5 py-1
        rounded-full
        border border-gradient-to-r from-purple-600 to-cyan-500
        shadow-sm
      "
          >
            Last used
          </span>
        ) : null}
        <RateLimitedButton
          rateLimitKey="email_auth"
          maxRequests={10}
          windowMs={15 * 60 * 1000}
          countdownMessage="Too many authentication attempts. Try again in"
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-500"
          disabled={loading}
          onClick={handleFormSubmit}
        >
          {loading ? "Loading..." : mode === "register" ? "Sign Up" : "Sign In"}
        </RateLimitedButton>
      </div>
    </form>
  );
}