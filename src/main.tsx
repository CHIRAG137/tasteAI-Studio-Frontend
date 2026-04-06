import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Auth0Provider } from "@auth0/auth0-react";
import { Auth0LogoutListener } from "@/components/auth/Auth0LogoutListener";
import { AgentAuth0LogoutListener } from "@/components/agent/AgentAuth0LogoutListener";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const auth0Enabled = !!(auth0Domain && auth0ClientId);

const rootTree = auth0Enabled ? (
  <Auth0Provider
    domain={auth0Domain}
    clientId={auth0ClientId}
    authorizationParams={{
      redirect_uri: `${window.location.origin}/callback`,
      ...(auth0Audience ? { audience: auth0Audience } : {}),
      scope: "openid profile email offline_access",
    }}
    cacheLocation="localstorage"
    useRefreshTokens={true}
  >
    <Auth0LogoutListener />
    <AgentAuth0LogoutListener />
    <App />
  </Auth0Provider>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    {rootTree}
  </GoogleOAuthProvider>
);
