const HtmlWebpackPlugin = require('html-webpack-plugin');
const { container } = require('webpack');
const deps = require('./package.json').dependencies;

/**
 * REMOTE: Catalog team owns this app.
 * - exposes: modules the host can import(), e.g. catalog/Catalog
 * - CORS header: host runs on another port and fetches remoteEntry.js from here
 */
module.exports = {
  entry: './src/index.js',
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    port: 3001,
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  output: {
    publicPath: 'http://localhost:3001/',
  },
  module: {
    rules: [{ test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' }],
  },
  resolve: { extensions: ['.js', '.jsx'] },
  plugins: [
    new container.ModuleFederationPlugin({
      name: 'catalog',
      filename: 'remoteEntry.js',
      exposes: {
        './Catalog': './src/CatalogApp.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
        'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
      },
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
};
