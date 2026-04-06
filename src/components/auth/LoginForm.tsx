import { Link, useNavigate, useLocation } from "react-router-dom";
import { Auth0LoginButton } from "@/components/auth/Auth0LoginButton";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const auth0Configured = !!(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  return (
    <div className="space-y-6">
      {auth0Configured && <Auth0LoginButton mode="login" />}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
};
