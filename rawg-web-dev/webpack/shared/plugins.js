/* eslint-disable import/prefer-default-export */

import path from 'path';
import webpack from 'webpack';

import env from '../../src/config/env';
import RAWG_RELEASE from '../../src/ssr/server/tools/get-release';

export const LoaderOptionsPlugin = new webpack.LoaderOptionsPlugin({
  minimize: env.isProd(),
  options: {
    stylus: {
      import: [
        path.resolve('./src/styles/vars.styl'),
        path.resolve('./src/styles/mixins.styl'),
      ],
    },
  },
});

export const DefinePlugin = new webpack.DefinePlugin({
  'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
  RAWG_RELEASE: JSON.stringify(RAWG_RELEASE),
});
