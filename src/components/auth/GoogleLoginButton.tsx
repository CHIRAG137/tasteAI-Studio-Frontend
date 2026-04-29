import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { googleLoginUser, humanAgentGoogleLogin } from "@/api/auth";
import { setAuthToken, setLoginProvider, ensureLoginDeviceId } from "@/utils/auth";
import { toast } from "sonner";

type Props = {
  mode?: "login" | "register";
  isAgent?: boolean;
  badgeText?: string;
};

export function GoogleLoginButton({ mode = "login", isAgent = false, badgeText }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse: any) => {
      try {
        const apiCall = isAgent ? humanAgentGoogleLogin : googleLoginUser;
        const token = tokenResponse.access_token;
        const deviceId = ensureLoginDeviceId();
        const response = await apiCall(token, deviceId);

        if (response.status === "success") {
          setAuthToken(response.result.token);
          setLoginProvider("google");
          toast.success("Login successful!");
          navigate(from, { replace: true });
        } else {
          toast.error(response.message || "Google login failed");
        }
      } catch (error) {
        console.error("Google login error:", error);
        toast.error("Google login failed");
      }
    },
    onError: () => {
      toast.error("Google login failed");
    },
  });

  return (
    <div className="relative inline-block w-full">
      {badgeText ? (
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
          {badgeText}
        </span>
      ) : null}
      <Button
        type="button"
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
        onClick={() => googleLogin()}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {mode === "register" ? "Sign Up with Google" : "Sign In with Google"}
      </Button>
    </div>
  );
}