export type RetryOptions = {
  retries: number;
  /** base delay in ms (exponential backoff: base * 2^attempt) */
  baseDelayMs?: number;
  /** optional cap */
  maxDelayMs?: number;
  /** jitter 0..1 fraction of delay */
  jitter?: number;
  /** when to retry (default: network/5xx) */
  retryWhen?: (error: unknown, attempt: number) => boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultRetryWhen(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: number }).status;
    return s >= 500 || s === 429;
  }
  return true;
}

export async function retryFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: RetryOptions
): Promise<Response> {
  const {
    retries,
    baseDelayMs = 300,
    maxDelayMs = 8000,
    jitter = 0.1,
    retryWhen = defaultRetryWhen,
  } = options;

  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return res;
      const err = Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      if (attempt >= retries || !retryWhen(err, attempt)) return res;
    } catch (e) {
      if (attempt >= retries || !retryWhen(e, attempt)) throw e;
    }

    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const jitterMs = exp * jitter * Math.random();
    await sleep(exp + jitterMs);
    attempt += 1;
  }
}

/** Generic async retry around any function returning a promise. */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    retries,
    baseDelayMs = 300,
    maxDelayMs = 8000,
    jitter = 0.1,
    retryWhen = () => true,
  } = options;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !retryWhen(e, attempt)) throw e;
      const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitterMs = exp * jitter * Math.random();
      await sleep(exp + jitterMs);
      attempt += 1;
    }
  }
}
