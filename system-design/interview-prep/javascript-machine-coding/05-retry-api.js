function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultRetryWhen(error) {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = error.status;
    return s >= 500 || s === 429;
  }
  return true;
}

export async function retryFetch(input, init, options) {
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

export async function withRetry(fn, options) {
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
