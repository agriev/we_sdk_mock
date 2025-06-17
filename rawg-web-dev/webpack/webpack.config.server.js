/* eslint-disable optimize-regex/optimize-regex */

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

import env from '../src/config/env';

import { imageLoaders, sharedStylLoaders, stylusLoader } from './shared/file-loaders';

import devtool from './shared/devtool';
import getOutput from './shared/output';
import resolve from './shared/resolve';
import { LoaderOptionsPlugin, DefinePlugin } from './shared/plugins';

const output = getOutput('server');

export default {
  target: 'node',
  bail: env.isProd(),
  entry: './src/ssr/server/server.js',
  mode: env.isDev() ? 'development' : 'production',

  devtool,
  resolve,
  output,

  module: {
    rules: [
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['thread-loader', 'babel-loader'],
      },
      {
        test: /\.styl$/,
        use: [...sharedStylLoaders('server'), stylusLoader],
      },
      {
        test: /\.css$/,
        use: [...sharedStylLoaders('server')],
      },
      {
        test: /\.html$/,
        use: ['raw-loader'],
      },
      ...imageLoaders,
    ],
  },

  plugins: [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }), DefinePlugin, LoaderOptionsPlugin],

  externals: [
    // in order to ignore all modules in node_modules folder
    nodeExternals({
      whitelist: [
        /\.css$/,
        'swiper',
        'swiper/react',
        'ssr-window',
        'dom7',
        (v) =>
          v.indexOf('babel-plugin-universal-import') === 0 ||
          v.indexOf('react-universal-component') === 0 ||
          v.indexOf('webpack-flush-chunks') === 0,
      ],
    }),
  ],

  optimization: {
    minimize: false,
    concatenateModules: false, // env.isProd(),
  },
};
