const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { container } = require('webpack');

/**
 * Single dev server (one port) = one SPA-style origin: host at /, remotes at /catalog/ and /checkout/.
 * Webpack multi-compiler: https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations
 */
const deps = require('./host/package.json').dependencies;

const DEV_ORIGIN = 'http://localhost:3000';

const shared = {
  react: { singleton: true, requiredVersion: deps.react },
  'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
  'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
};

const ruleJs = {
  test: /\.jsx?$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-react'],
      configFile: path.resolve(__dirname, 'babel.config.json'),
    },
  },
};

const resolveModules = {
  extensions: ['.js', '.jsx'],
  modules: [path.resolve(__dirname, 'node_modules')],
};

module.exports = [
  {
    name: 'host',
    context: path.resolve(__dirname, 'host'),
    entry: './src/index.js',
    mode: 'development',
    devtool: 'source-map',
    devServer: {
      port: 3000,
      historyApiFallback: true,
    },
    output: {
      path: path.resolve(__dirname, 'dist/host'),
      uniqueName: 'host',
      publicPath: 'auto',
    },
    module: { rules: [ruleJs] },
    resolve: resolveModules,
    plugins: [
      new container.ModuleFederationPlugin({
        name: 'host',
        remotes: {
          catalog: `catalog@${DEV_ORIGIN}/catalog/remoteEntry.js`,
          checkout: `checkout@${DEV_ORIGIN}/checkout/remoteEntry.js`,
        },
        shared,
      }),
      new HtmlWebpackPlugin({ template: './public/index.html' }),
    ],
  },
  {
    name: 'catalog',
    context: path.resolve(__dirname, 'catalog'),
    entry: './src/index.js',
    mode: 'development',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist/catalog'),
      uniqueName: 'catalog',
      publicPath: `${DEV_ORIGIN}/catalog/`,
    },
    module: { rules: [ruleJs] },
    resolve: resolveModules,
    plugins: [
      new container.ModuleFederationPlugin({
        name: 'catalog',
        filename: 'remoteEntry.js',
        exposes: { './Catalog': './src/CatalogApp.js' },
        shared,
      }),
      new HtmlWebpackPlugin({ template: './public/index.html' }),
    ],
  },
  {
    name: 'checkout',
    context: path.resolve(__dirname, 'checkout'),
    entry: './src/index.js',
    mode: 'development',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist/checkout'),
      uniqueName: 'checkout',
      publicPath: `${DEV_ORIGIN}/checkout/`,
    },
    module: { rules: [ruleJs] },
    resolve: resolveModules,
    plugins: [
      new container.ModuleFederationPlugin({
        name: 'checkout',
        filename: 'remoteEntry.js',
        exposes: { './Checkout': './src/CheckoutApp.js' },
        shared,
      }),
      new HtmlWebpackPlugin({ template: './public/index.html' }),
    ],
  },
];
