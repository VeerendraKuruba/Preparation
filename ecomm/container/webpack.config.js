const HtmlWebpackPludin = require('html-webpack-plugin');
const ModuleFedarationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
    mode: 'development',
    output: {
        uniqueName: 'container',
    },
    devServer: {
        port : 8080,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    plugins:[
        new ModuleFedarationPlugin({
            name:'container',
            remotes:{
                products:'products@http://localhost:8081/remoteEntry.js',
                cart:'cart@http://localhost:8082/remoteEntry.js'
            }
        }),
        new HtmlWebpackPludin(
            {
                template: './public/index.html'
            }
        )
    ]
}