/**
 * structuredClone when available; fallback: plain objects, arrays, Date,
 * RegExp, Map, Set, typed arrays. No functions / prototypes.
 */

export function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* continue */
    }
  }

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const next = new Map();
    seen.set(value, next);
    for (const [k, v] of value) {
      next.set(deepClone(k, seen), deepClone(v, seen));
    }
    return next;
  }

  if (value instanceof Set) {
    const next = new Set();
    seen.set(value, next);
    for (const v of value) next.add(deepClone(v, seen));
    return next;
  }

  if (ArrayBuffer.isView(value)) {
    const len = value.byteLength;
    const copy = new ArrayBuffer(len);
    new Uint8Array(copy).set(new Uint8Array(value.buffer, value.byteOffset, len));
    const Ctor = value.constructor;
    return new Ctor(copy);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const arr = [];
    seen.set(value, arr);
    for (let i = 0; i < value.length; i++) arr[i] = deepClone(value[i], seen);
    return arr;
  }

  if (seen.has(value)) return seen.get(value);
  const out = {};
  seen.set(value, out);
  for (const k of Object.keys(value)) {
    out[k] = deepClone(value[k], seen);
  }
  return out;
}
