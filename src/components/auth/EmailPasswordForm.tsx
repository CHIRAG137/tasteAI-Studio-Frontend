import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, registerUser, humanAgentLogin } from "@/api/auth";
import { setAuthToken, setLoginProvider, ensureLoginDeviceId } from "@/utils/auth";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        toast.error(response.message || `${mode === "register" ? "Registration" : "Login"} failed`);
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error(`${mode === "register" ? "Registration" : "Login"} failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-cyan-500
" disabled={loading}>
          {loading ? "Loading..." : mode === "register" ? "Sign Up" : "Sign In"}
        </Button>
      </div>
    </form>
  );
}