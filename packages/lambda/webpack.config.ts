import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';

const src = path.resolve(__dirname, 'src');

const config: webpack.Configuration = {
  mode: 'none', // none | production | development - eval()
  context: src,
  entry: () => {
    // all files from src as entries, may apply filtering here
    const entries = fs.readdirSync(src).reduce((res, filename) => {
      const entry = path.basename(filename, '.ts');
      res[entry] = './' + filename;
      return res;
    }, {} as any);
    // {
    //   "hello": './hello.ts',
    //   "hitcounter": './hitcounter.ts'
    // }
    return entries;
  },
  externals: ['aws-sdk'],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
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
    path: path.resolve(__dirname, 'lib')
  },
  target: 'node'
};

export default config;
