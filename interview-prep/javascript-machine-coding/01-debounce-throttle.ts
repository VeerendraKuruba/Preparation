/** Leading: run on first call within window; trailing: run after quiet period. */

export type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number,
  options: DebounceOptions = {}
): ((...args: Parameters<T>) => void) & { cancel(): void } {
  const { leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let leadingCalled = false;

  const invoke = () => {
    if (lastArgs) fn(...lastArgs);
    lastArgs = undefined;
  };

  const debounced = (...args: Parameters<T>) => {
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

export type ThrottleOptions = { leading?: boolean; trailing?: boolean };

/** At most one call per window; trailing fires latest pending args after window. */

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number,
  options: ThrottleOptions = {}
): ((...args: Parameters<T>) => void) & { cancel(): void } {
  const { leading = true, trailing = true } = options;
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;

  const throttled = (...args: Parameters<T>) => {
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
