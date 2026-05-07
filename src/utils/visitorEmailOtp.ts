import { ensureLoginDeviceId } from "@/utils/auth";

const tokenKey = (botId: string) => `visitor_email_otp_token_${botId}`;
const emailKey = (botId: string) => `visitor_email_otp_email_${botId}`;

export function saveVisitorEmailVerification(botId: string, token: string, email: string) {
  try {
    localStorage.setItem(tokenKey(botId), token);
    localStorage.setItem(emailKey(botId), email);
  } catch {
    // ignore quota
  }
}

export function clearVisitorEmailVerification(botId: string) {
  localStorage.removeItem(tokenKey(botId));
  localStorage.removeItem(emailKey(botId));
}

export function getVisitorEmailVerificationToken(botId: string): string | null {
  return localStorage.getItem(tokenKey(botId));
}

export function getVisitorEmail(botId: string): string | null {
  return localStorage.getItem(emailKey(botId));
}

export function visitorEmailOtpHeaders(botId: string): Record<string, string> {
  const token = getVisitorEmailVerificationToken(botId);
  if (!token) return { "X-Visitor-Device-Id": ensureLoginDeviceId() };
  const h: Record<string, string> = {
    "X-Visitor-Verification-Token": token,
    "X-Visitor-Device-Id": ensureLoginDeviceId(),
  };
  const email = getVisitorEmail(botId);
  if (email) h["X-Visitor-Email"] = email;
  return h;
}

