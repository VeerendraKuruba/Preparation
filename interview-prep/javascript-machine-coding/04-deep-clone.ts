/**
 * Structured clone when available; fallback handles plain objects, arrays,
 * Date, RegExp, Map, Set, and ArrayBuffer-ish. Does not preserve functions
 * or prototypes (interview: call outtrade-offs vs lodash / structuredClone).
 */

export function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fall through for unsupported types in some engines */
    }
  }

  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as T;

  if (value instanceof Map) {
    const next = new Map();
    seen.set(value as object, next);
    for (const [k, v] of value) {
      next.set(deepClone(k, seen), deepClone(v, seen));
    }
    return next as T;
  }

  if (value instanceof Set) {
    const next = new Set();
    seen.set(value as object, next);
    for (const v of value) next.add(deepClone(v, seen));
    return next as T;
  }

  if (ArrayBuffer.isView(value)) {
    const len = value.byteLength;
    const copy = new ArrayBuffer(len);
    new Uint8Array(copy).set(
      new Uint8Array(value.buffer, value.byteOffset, len)
    );
    const Ctor = value.constructor as new (b: ArrayBuffer) => ArrayBufferView;
    return new Ctor(copy) as T;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value) as T;
    const arr: unknown[] = [];
    seen.set(value, arr);
    for (let i = 0; i < value.length; i++) arr[i] = deepClone(value[i], seen);
    return arr as T;
  }

  if (seen.has(value)) return seen.get(value) as T;
  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const k of Object.keys(value as object)) {
    out[k] = deepClone((value as Record<string, unknown>)[k], seen);
  }
  return out as T;
}
