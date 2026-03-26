// Async entry so shared deps (react, etc.) are not consumed in the first synchronous chunk.
// See: https://webpack.js.org/concepts/module-federation/#uncaught-error-shared-module-is-not-available-for-eager-consumption
import('./bootstrap');
