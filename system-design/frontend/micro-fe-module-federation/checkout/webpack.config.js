const HtmlWebpackPlugin = require('html-webpack-plugin');
const { container } = require('webpack');
const deps = require('./package.json').dependencies;

/**
 * REMOTE: Checkout team owns this app.
 */
module.exports = {
  entry: './src/index.js',
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    port: 3002,
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  output: {
    publicPath: 'http://localhost:3002/',
  },
  module: {
    rules: [{ test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' }],
  },
  resolve: { extensions: ['.js', '.jsx'] },
  plugins: [
    new container.ModuleFederationPlugin({
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        './Checkout': './src/CheckoutApp.js',
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
