import path from 'path';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import SentryPlugin from '@sentry/webpack-plugin';
import StatsPlugin from 'stats-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CompiledAtPlugin from 'webpack-compiled-at-plugin';
import FriendlyErrorsWebpackPlugin from 'friendly-errors-webpack-plugin';
import notifier from 'node-notifier';
import compact from 'lodash/compact';
import ip from 'ip';

import ExtractCssChunks from 'extract-css-chunks-webpack-plugin';

import env from '../../src/config/env';
import config from '../../src/config/config';
import CleanUpStatsPlugin from '../plugins/clean-up-stats-plugin';
import RAWG_RELEASE from '../../src/ssr/server/tools/get-release';

import { LoaderOptionsPlugin, DefinePlugin } from '../shared/plugins';

const ICON = path.join(__dirname, '../src/ssr/client/assets/apple-icon.png');

const host = config.private.serverHostname;
const port = config.private.serverPort;

const localAddress = `http://${host}:${port}`;
const ipAddress = `http://${ip.address()}:${port}`;

const plugins = compact([
  env.isProd() && new CleanUpStatsPlugin(),

  new webpack.ContextReplacementPlugin(
    /node_modules\/(?:react-)?intl\/locale-data(?:\/jsonp)?/,
    new RegExp(`\/(${config.locales.join('|')})\.js$`), // eslint-disable-line no-useless-escape
  ),

  DefinePlugin,
  LoaderOptionsPlugin,

  new HtmlWebpackPlugin({
    template: './src/templates/index.html',
    filename: 'index.html',
    inject: env.isDev(),
  }),

  // new HtmlWebpackPlugin({
  //   template: './src/templates/amp.html',
  //   filename: 'amp.html',
  //   inject: env.isDev(),
  //   // excludeChunks: ['styles'],
  // }),

  env.isDev() && new webpack.HotModuleReplacementPlugin(),

  new webpack.HashedModuleIdsPlugin({
    hashFunction: 'sha256',
    hashDigest: 'hex',
    hashDigestLength: 10,
  }),

  env.isDev() &&
    new FriendlyErrorsWebpackPlugin({
      compilationSuccessInfo: {
        messages: [`You application is running here ${localAddress}, ${ipAddress}`],
      },
      onErrors: (severity, errors) => {
        if (severity !== 'error') {
          return;
        }
        const error = errors[0];
        notifier.notify({
          title: `RAWG has ${errors.length} files with compilation errors.`,
          message: `${error.name} in file ${error.file}`,
          icon: ICON,
          sound: true,
          timeout: 5,
        });
      },
    }),

  env.isProd() &&
    new ExtractCssChunks({
      hot: env.isDev(),
      filename: 'client/css/[name].[contenthash].css',
      chunkFilename: 'client/css/[name].[id].[contenthash].css',
      orderWarning: false,
    }),

  env.isDev() && new CompiledAtPlugin(),

  env.isProd() &&
    new StatsPlugin('stats.json', {
      assets: true,
      cached: false,
      cachedAssets: false,
      children: false,
      chunks: true,
      chunkModules: false,
      chunkOrigins: false,
      modules: false,
      performance: false,
      source: false,
    }),

  env.isProd() &&
    function ExitOnCompilationError() {
      this.plugin('done', (stats) => {
        if (stats.compilation.errors && stats.compilation.errors.length > 0) {
          /* eslint-disable no-console */
          console.log(`Found following ${stats.compilation.errors.length} compilation error(s):`);
          stats.compilation.errors.forEach((theError) => {
            console.log(theError);
          });
          process.exit(1); // eslint-disable-line unicorn/no-process-exit
        }
      });
    },

  config.sentryEnabled &&
    new SentryPlugin({
      // All options: https://github.com/getsentry/sentry-webpack-plugin#options
      include: './build',
      ignore: ['node_modules'],
      urlPrefix: '~/assets/',
      release: RAWG_RELEASE,
    }),

  config.bundleAnalyzerEnabled && new BundleAnalyzerPlugin(),
]);

export default plugins;
