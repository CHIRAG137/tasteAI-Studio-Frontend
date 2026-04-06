export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

export const registerUser = async (data: any) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const loginUser = async (data: any) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const logoutBotUser = async (token: string) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout/bot`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });
  return res.json();
};

export const logoutAgentUser = async (token: string) => {
  const res = await fetch(`${API_BASE_URL}/api/human-agent/logout`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });
  return res.json();
};

export const exchangeTokenVaultToken = async (
  appJwt: string,
  auth0AccessToken: string,
  connection: string
) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/token-vault/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appJwt}`,
    },
    body: JSON.stringify({
      accessToken: auth0AccessToken,
      connection,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      status: "error" as const,
      message: data.message || "Token exchange failed",
      error: data.error,
    };
  }
  return data;
};
