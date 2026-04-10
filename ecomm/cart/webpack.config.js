const HtmlWebpackPludin = require('html-webpack-plugin');
const ModuleFedarationPlugin = require('webpack/lib/container/ModuleFederationPlugin')

module.exports = {
    mode: 'development',
    output: {
        uniqueName: 'cart',
        publicPath: 'http://localhost:8082/',
    },
    devServer: {
        port : 8082,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    plugins:[
        new ModuleFedarationPlugin({
            name:'cart',
            filename: 'remoteEntry.js',
            exposes: {
                './CartShow':'./src/index'
            },
            // shared: ['faker'] if both mfs versions are different container will load both 
            // incase singleton rule it will install one with warning
            shared: {
                faker:{
                    singleton:true
                }
            }
        }),
        new HtmlWebpackPludin(
            {
                template: './public/index.html'
            }
        )
    ]
}