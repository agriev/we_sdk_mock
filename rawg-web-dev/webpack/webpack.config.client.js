/* eslint-disable optimize-regex/optimize-regex */

import env from '../src/config/env';

import plugins from './client/plugins';
import module from './client/file-loaders';
import optimization from './client/optimization';
import entry from './client/entry';

import devtool from './shared/devtool';
import resolve from './shared/resolve';
import getOutput from './shared/output';

const output = getOutput('client');

export default {
  bail: env.isProd(),
  mode: env.isDev() ? 'development' : 'production',

  entry,
  devtool,
  plugins,
  module,
  resolve,
  optimization,
  output,
};
