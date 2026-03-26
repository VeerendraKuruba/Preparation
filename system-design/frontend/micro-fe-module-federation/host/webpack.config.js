/**
 * Dev uses the repo-root webpack config (multi-compiler, single port 3000).
 * Run: npm install && npm start from the parent micro-fe-module-federation folder,
 * or: npm start from host/ (webpack loads this file which re-exports the full config).
 */
module.exports = require('../webpack.config.js');
