/* eslint-disable no-console, unicorn/no-process-exit */

import colors from 'colors/safe';
import webpack from 'webpack';

import humanTimeDiff from 'tools/human-time-diff';

import webpackClientConfig from './webpack.config.client';
import webpackServerConfig from './webpack.config.server';

console.log(colors.blue.bold('Compiling client & server bundles…'));

const start = new Date();

const logErr = (prefix, err) => {
  console.log(prefix);
  console.error(err);
  process.exit(1);
};

const logStats = (stats) => {
  console.log(stats.toString({
    colors: true,
    chunkModules: false,
  }));
};

webpack(webpackClientConfig).run((errClient, statsClient) => {
  if (errClient) { logErr('Error on building client', errClient); }

  logStats(statsClient);
  console.log('\n\nSuccessfuly builded client app.\n\n');

  webpack(webpackServerConfig).run((errServer, statsServer) => {
    if (errServer) { logErr('Error on building server', errServer); }

    logStats(statsServer);
    console.log('\n\nSuccessfuly builded server app.\n\n');
  });

  console.log(' ');
  console.log(`Compilation time: ${humanTimeDiff(start)}.`);
});
