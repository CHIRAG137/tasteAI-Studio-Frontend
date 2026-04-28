import { Link, useNavigate, useLocation } from "react-router-dom";
import { Auth0LoginButton } from "@/components/auth/Auth0LoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";
  const message = (location.state as any)?.message;

  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
        {googleConfigured && <GoogleLoginButton mode="login" />}
        {auth0Configured && <Auth0LoginButton mode="login" />}
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

      <EmailPasswordForm mode="login" />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
};
