import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';

const lambda = path.resolve(__dirname, 'lambda');

const config: webpack.Configuration = {
  mode: 'none', // none | production | development - eval()
  context: path.resolve(__dirname),
  entry: () => {
    // all files from src as entries, may apply filtering here
    const entries = fs.readdirSync(lambda).reduce((res, filename) => {
      const entry = path.basename(filename, '.ts');
      res[entry] = './lambda/' + filename;
      return res;
    }, {} as any);
    // {
    //   "hello": './lambda/hello.ts',
    //   "hitcounter": './lambda/hitcounter.ts'
    // }
    return entries;
  },
  externals: ['aws-sdk'],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{
          loader: 'ts-loader',
          options: { configFile: 'tsconfig.lambda.json' }
        }]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    namedChunks: true,
    namedModules: true
  },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist/lambda')
  },
  target: 'node'
};

export default config;
