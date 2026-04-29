import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Auth0LoginButton } from "@/components/auth/Auth0LoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { getLoginProvider, getLoginDeviceId, setLoginProvider, type LoginProvider } from "@/utils/auth";
import { getLastLoginByDeviceId } from "@/api/auth";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";
  const message = (location.state as any)?.message;

  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [lastLoginProvider, setLastLoginProvider] = useState<LoginProvider | null>(getLoginProvider());

  useEffect(() => {
    if (lastLoginProvider) return;

    const deviceId = getLoginDeviceId();
    if (!deviceId) return;

    getLastLoginByDeviceId(deviceId)
      .then((data) => {
        const method = data?.result?.lastLogin?.method;
        if (!method) return;

        const provider =
          method === "google"
            ? "google"
            : method === "auth0"
            ? "auth0"
            : method === "email_password"
            ? "local"
            : null;

        if (provider) {
          setLastLoginProvider(provider);
          setLoginProvider(provider);
        }
      })
      .catch(() => {
        // ignore fallback errors
      });
  }, [lastLoginProvider]);

  const googleBadgeText = lastLoginProvider === "google" ? "Last used" : undefined;
  const auth0BadgeText = lastLoginProvider === "auth0" ? "Last used" : undefined;
  const showEmailBadge = lastLoginProvider === "local";

  return (
    <div className="space-y-6">
      {message && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {message}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-4">
        {googleConfigured && <GoogleLoginButton mode="login" badgeText={googleBadgeText} />}
        {auth0Configured && <Auth0LoginButton mode="login" badgeText={auth0BadgeText} />}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <EmailPasswordForm mode="login" showLastUsedBadge={showEmailBadge} />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
};
