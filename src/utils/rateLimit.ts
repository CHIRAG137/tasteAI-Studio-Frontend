import { useRateLimit } from '@/hooks/useRateLimit';

export interface RateLimitError {
  isRateLimited: boolean;
  retryAfter: number;
  message: string;
}

export const extractRetryAfterSeconds = (error: unknown, fallbackSeconds = 900): number => {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

  const retryAfterMatch = message.match(/retry[\s_-]*after[:\s]*(\d+)/i);
  if (retryAfterMatch?.[1]) {
    return Math.max(1, parseInt(retryAfterMatch[1], 10));
  }

  const secondsMatch = message.match(/try again in\s*(\d+)\s*seconds?/i);
  if (secondsMatch?.[1]) {
    return Math.max(1, parseInt(secondsMatch[1], 10));
  }

  const minutesMatch = message.match(/try again in\s*(\d+)\s*minutes?/i);
  if (minutesMatch?.[1]) {
    return Math.max(1, parseInt(minutesMatch[1], 10) * 60);
  }

  return fallbackSeconds;
};

export const setRateLimitByKey = (key: string, retryAfterSeconds: number) => {
  const retryAfter = Date.now() + (retryAfterSeconds * 1000);
  localStorage.setItem(
    `ratelimit_${key}`,
    JSON.stringify({ retryAfter, lastRequestTime: Date.now() })
  );
  window.dispatchEvent(new CustomEvent("ratelimit:update", { detail: { key } }));
};

export const parseRateLimitError = (error: any): RateLimitError | null => {
  if (!error) return null;

  // Check for rate limit error patterns
  const errorMessage = error.message || error.error || '';
  const isRateLimited =
    errorMessage.toLowerCase().includes('too many') ||
    errorMessage.toLowerCase().includes('rate limit') ||
    errorMessage.toLowerCase().includes('try again later');

  if (!isRateLimited) return null;

  // Extract retry-after from response headers or error message
  let retryAfter = 900; // Default 15 minutes in seconds

  // Try to extract from error message (e.g., "retryAfter: 900")
  retryAfter = extractRetryAfterSeconds(errorMessage, retryAfter);

  return {
    isRateLimited: true,
    retryAfter,
    message: errorMessage
  };
};

export const handleApiResponse = async (
  response: Response,
  rateLimitHook: ReturnType<typeof useRateLimit>
) => {
  const { handleRateLimitError } = rateLimitHook;

  if (response.status === 429) {
    // Rate limited by server
    const retryAfter = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 900;

    handleRateLimitError(retryAfterSeconds);
    throw new Error(`Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rateLimitError = parseRateLimitError(errorData);

    if (rateLimitError) {
      handleRateLimitError(rateLimitError.retryAfter);
      throw new Error(rateLimitError.message);
    }

    throw new Error(errorData.error || errorData.message || 'API request failed');
  }

  return response;
};

// Rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  CHATBOT_ASK: {
    key: 'chatbot_ask',
    maxRequests: 20,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  EMBED_CHATBOT: {
    key: 'embed_chatbot',
    maxRequests: 50,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  GENERAL_API: {
    key: 'general_api',
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
};