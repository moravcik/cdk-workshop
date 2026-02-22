const { path: rootPath } = require('app-root-path');
const { resolve } = require('path');

const awsModules = [
  '@aws-sdk/client-dynamodb',
  '@aws-sdk/client-s3',
  '@aws-sdk/lib-dynamodb',
  '@aws-sdk/s3-request-presigner',
  '@aws-sdk/client-iam'
];
const layerModules = ['sharp'];

const config = {
  mode: 'none',
  context: resolve(rootPath),
  entry: {
    // 'hello-lambda': './lib/api/hello-lambda.ts',
    'pin-lambda': './lib/api/pin-lambda.ts',
    'thumbnail-lambda': './lib/api/thumbnail-lambda.ts'
  },
  externals: [...awsModules, ...layerModules],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: 'lib/tsconfig.api.json',
            transpileOnly: true
          }
        }]
      }
    ]
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: resolve(rootPath, 'dist/api')
  },
  target: 'node',
  devtool: 'cheap-source-map'
};

module.exports = config;
