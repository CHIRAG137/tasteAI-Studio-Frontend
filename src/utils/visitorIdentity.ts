const key = (botId: string) => `visitor_auth0_${botId}`;
const tokenKey = (botId: string) => `visitor_auth0_access_token_${botId}`;

export type VisitorIdentity = {
  sub: string;
  email?: string;
  name?: string;
};

export function saveVisitorIdentity(botId: string, info: VisitorIdentity): void {
  try {
    sessionStorage.setItem(key(botId), JSON.stringify(info));
  } catch {
    /* ignore quota */
  }
}

export function getVisitorIdentity(botId: string): VisitorIdentity | null {
  try {
    const raw = sessionStorage.getItem(key(botId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorIdentity;
    if (!parsed?.sub) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearVisitorIdentity(botId: string): void {
  sessionStorage.removeItem(key(botId));
  sessionStorage.removeItem(tokenKey(botId));
}

export function saveVisitorAccessToken(botId: string, token: string): void {
  try {
    sessionStorage.setItem(tokenKey(botId), token);
  } catch {
    /* ignore quota */
  }
}

export function getVisitorAccessToken(botId: string): string | null {
  return sessionStorage.getItem(tokenKey(botId));
}

/** Headers for public/embed chat APIs when the bot requires Auth0 identity */
export function visitorHeaders(botId: string): Record<string, string> {
  const v = getVisitorIdentity(botId);
  if (!v?.sub) return {};
  const h: Record<string, string> = { "X-Visitor-Auth0-Sub": v.sub };
  if (v.email) h["X-Visitor-Email"] = v.email;
  const t = getVisitorAccessToken(botId);
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}
