/** Leading: first call in window; trailing: after quiet period. */

export function debounce(fn, waitMs, options = {}) {
  const { leading = false, trailing = true } = options;
  let timer;
  let lastArgs;
  let leadingCalled = false;

  const invoke = () => {
    if (lastArgs) fn(...lastArgs);
    lastArgs = undefined;
  };

  const debounced = (...args) => {
    lastArgs = args;
    if (timer != null) clearTimeout(timer);

    if (leading && !leadingCalled) {
      leadingCalled = true;
      fn(...args);
      lastArgs = undefined;
    }

    timer = setTimeout(() => {
      timer = undefined;
      leadingCalled = false;
      if (trailing && lastArgs) invoke();
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer != null) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
    leadingCalled = false;
  };

  return debounced;
}

/** At most one call per window; trailing fires latest pending args. */

export function throttle(fn, waitMs, options = {}) {
  const { leading = true, trailing = true } = options;
  let last = 0;
  let timer;
  let lastArgs;

  const throttled = (...args) => {
    const now = Date.now();
    lastArgs = args;
    const remaining = waitMs - (now - last);

    if (remaining <= 0) {
      if (timer != null) {
        clearTimeout(timer);
        timer = undefined;
      }
      last = now;
      if (leading) fn(...args);
      lastArgs = undefined;
      return;
    }

    if (trailing && timer == null) {
      timer = setTimeout(() => {
        timer = undefined;
        last = Date.now();
        if (lastArgs) fn(...lastArgs);
        lastArgs = undefined;
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer != null) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
    last = 0;
  };

  return throttled;
}
