/* eslint-disable global-require */

const webpack = require('webpack');
const webpackConfig = require('../../../webpack/webpack.config.server').default;

// webpackConfig.watch = true;

const bundler = webpack(webpackConfig);

bundler.run();
