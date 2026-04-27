// Agent Authentication utility functions
const AGENT_LOGIN_PROVIDER_KEY = "agentLoginProvider";

export type AgentLoginProvider = "local" | "auth0" | "google";

export const setAgentLoginProvider = (provider: AgentLoginProvider): void => {
  localStorage.setItem(AGENT_LOGIN_PROVIDER_KEY, provider);
};

export const getAgentLoginProvider = (): AgentLoginProvider | null => {
  const v = localStorage.getItem(AGENT_LOGIN_PROVIDER_KEY);
  if (v === "local" || v === "auth0" || v === "google") return v;
  return null;
};

export const clearAgentLoginProvider = (): void => {
  localStorage.removeItem(AGENT_LOGIN_PROVIDER_KEY);
};

export const getAgentAuthToken = (): string | null => {
  return localStorage.getItem('agentAuthToken');
};

export const setAgentAuthToken = (token: string): void => {
  localStorage.setItem('agentAuthToken', token);
};

export const removeAgentAuthToken = (): void => {
  localStorage.removeItem("agentAuthToken");
  localStorage.removeItem("agentId");
  clearAgentLoginProvider();
};

export const getAgentAuthHeaders = (): Record<string, string> => {
  const token = getAgentAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAgentAuthenticated = (): boolean => {
  return !!getAgentAuthToken();
};

export const getAgentEmail = (): string | null => {
  return localStorage.getItem('agentEmail');
};

export const setAgentEmail = (email: string): void => {
  localStorage.setItem('agentEmail', email);
};

export const removeAgentEmail = (): void => {
  localStorage.removeItem('agentEmail');
};
