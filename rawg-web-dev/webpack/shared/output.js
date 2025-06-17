import path from 'path';

import env from '../../src/config/env';
import config from '../../src/config/config';

const getFilename = (mode) => {
  if (mode === 'client') {
    return env.isDev() ? `${mode}/js/${mode}.js` : `${mode}/js/${mode}.[chunkhash].js`;
  }

  return 'server.js';
};

const getOutput = (mode) => ({
  path: path.resolve(config.private.buildPath),
  filename: getFilename(mode),
  hashDigestLength: 12,
  sourceMapFilename: '[file].map', // 'sourcemaps/[file].map'
  publicPath: config.assetsPath,

  chunkFilename: env.isDev() ? `${mode}/js/[name].js` : `${mode}/js/[id].[chunkhash].js`,
  devtoolModuleFilenameTemplate: (info) => `file://${info.absoluteResourcePath.replace(/\\/g, '/')}`,
});

export default getOutput;
