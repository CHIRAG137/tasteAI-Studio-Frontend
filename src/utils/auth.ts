// Authentication utility functions
const LOGIN_PROVIDER_KEY = 'loginProvider';
const LOGIN_DEVICE_ID_KEY = 'loginDeviceId';

export type LoginProvider = 'local' | 'google' | 'auth0';

export const getLoginDeviceId = (): string | null => {
  return localStorage.getItem(LOGIN_DEVICE_ID_KEY);
};

export const ensureLoginDeviceId = (): string => {
  let deviceId = getLoginDeviceId();
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(LOGIN_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

export const setLoginProvider = (provider: LoginProvider): void => {
  localStorage.setItem(LOGIN_PROVIDER_KEY, provider);
};

export const getLoginProvider = (): LoginProvider | null => {
  const v = localStorage.getItem(LOGIN_PROVIDER_KEY);
  if (v === 'local' || v === 'google' || v === 'auth0') return v;
  return null;
};

export const clearLoginProvider = (): void => {
  localStorage.removeItem(LOGIN_PROVIDER_KEY);
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};