/**
 * Partial application polyfill in TypeScript.
 * Binds leading arguments to a function and returns a new function that accepts the rest.
 *
 * @example
 * const add = (a: number, b: number) => a + b;
 * const addFive = partial(add, 5);
 * addFive(3); // 8
 *
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const sayHello = partial(greet, 'Hello');
 * sayHello('World'); // 'Hello, World!'
 */

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Partially apply leading arguments to a function.
 * Returns a new function that takes the remaining arguments.
 */
function partial<T extends unknown[], R, P extends unknown[]>(
  fn: (...args: [...P, ...T]) => R,
  ...boundArgs: P
): (...args: T) => R {
  return function (this: unknown, ...restArgs: T): R {
    return fn.call(this, ...boundArgs, ...restArgs);
  };
}

/**
 * Partially apply leading arguments (untyped overload for dynamic use).
 */
function partialUntyped(fn: AnyFunction, ...boundArgs: unknown[]): AnyFunction {
  return function (this: unknown, ...restArgs: unknown[]) {
    return fn.apply(this, [...boundArgs, ...restArgs]);
  };
}

export { partial, partialUntyped };
export default partial;
