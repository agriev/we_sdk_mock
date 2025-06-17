/* eslint-disable optimize-regex/optimize-regex */

import ExtractCssChunks from 'extract-css-chunks-webpack-plugin';

import env from '../../src/config/env';
import { imageLoaders, sharedStylLoaders, stylusLoader } from '../shared/file-loaders';

const ExtractCSSLoader = {
  loader: ExtractCssChunks.loader,
  options: {
    hot: env.isDev(),
  },
};

const module = {
  rules: [
    {
      test: /\.md$/,
      use: 'raw-loader',
    },
    {
      test: /\.js$/,
      exclude: /node_modules/,
      use: [
        'thread-loader',
        'babel-loader',
        // {
        //   loader: 'eslint-loader',
        //   options: {
        //     emitWarning: env.isDev(),
        //     failOnError: env.isProd(),
        //   },
        // },
      ],
    },
    {
      test: /\.styl$/,
      use: [
        // 'null-loader',
        env.isDev() ? 'style-loader' : ExtractCSSLoader,
        ...sharedStylLoaders('client'),
        stylusLoader,
      ],
    },
    {
      test: /\.css$/,
      use: [env.isDev() ? 'style-loader' : ExtractCSSLoader, ...sharedStylLoaders('client')],
    },
    ...imageLoaders,
  ],
};

export default module;
