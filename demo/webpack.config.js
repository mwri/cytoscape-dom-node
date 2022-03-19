const path = require('path');


module.exports = {
    'entry': {
        'index': './src/index.js',
    },
    'output': {
        'library':  'cytoscape_dom_node_demo',
        'path':     path.join(__dirname, 'public'),
        'filename': 'cytoscape-dom-node-demo.bundle.js',
    },
    'node': {
        'fs':  'empty',
        'net': 'empty',
        'tls': 'empty',
    },
    'devServer': {
        'contentBase':      path.join(__dirname, 'public'),
        'watchContentBase': true,
    },
    'module': {
        'rules': [{
            'test': /\.(js|jsx)$/,
            'use': {
                'loader': 'babel-loader',
                'options': {
                    'presets': ['@babel/preset-react'],
                },
            },
        }],
    },
    'target': 'web',
    'mode': process.env.NODE_ENV || 'production',
    'resolve': {
        'alias': {
            'cytoscape-dom-node': path.resolve('..'),
            'cytoscape': path.resolve('node_modules', 'cytoscape'),
        },
    },
};
