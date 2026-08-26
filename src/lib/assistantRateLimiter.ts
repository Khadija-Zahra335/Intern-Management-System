// Sliding-window rate limiter for the mentor analytics assistant, in
// memory, keyed by the mentor's user id (every caller here is already
// authenticated.).

const requestLog = new Map<string, number[]>();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const MAX_PER_MINUTE = 10;
const MAX_PER_HOUR = 60;

export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const timestamps = requestLog.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < HOUR);
  const lastMinute = recent.filter((t) => now - t < MINUTE);

  if (lastMinute.length >= MAX_PER_MINUTE) {
    const retryAfter = Math.ceil((MINUTE - (now - lastMinute[0])) / 1000);
    return { allowed: false, retryAfter };
  }

  if (recent.length >= MAX_PER_HOUR) {
    const retryAfter = Math.ceil((HOUR - (now - recent[0])) / 1000);
    return { allowed: false, retryAfter };
  }

  recent.push(now);
  requestLog.set(userId, recent);
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of requestLog.entries()) {
    const recent = timestamps.filter((t) => now - t < HOUR);
    if (recent.length === 0) requestLog.delete(userId);
    else requestLog.set(userId, recent);
  }
}, 10 * MINUTE);