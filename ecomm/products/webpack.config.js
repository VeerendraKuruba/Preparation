const HtmlWebpackPludin = require('html-webpack-plugin');
const ModuleFedarationPlugin = require('webpack/lib/container/ModuleFederationPlugin')

module.exports = {
    mode: 'development',
    // Must differ per app: multiple builds on one page share globals; duplicate names collide chunks.
    output: {
        uniqueName: 'products',
        publicPath: 'http://localhost:8081/',
    },
    devServer: {
        port : 8081,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    plugins:[
        new ModuleFedarationPlugin({
            name:'products',
            filename: 'remoteEntry.js',
            exposes: {
                './ProductsIndex':'./src/index'
            },
            shared: ['faker']
        }),
        new HtmlWebpackPludin(
            {
                template: './public/index.html'
            }
        )
    ]
}