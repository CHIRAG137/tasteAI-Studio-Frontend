import { Link, useNavigate, useLocation } from "react-router-dom";
import { Auth0LoginButton } from "@/components/auth/Auth0LoginButton";

export const RegisterForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  return (
    <div className="space-y-6">
      {auth0Configured && <Auth0LoginButton mode="register" />}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
};
