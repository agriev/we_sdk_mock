/* eslint-disable no-console, global-require */

/**
 * Этот файл запускает проект в дев окружении
 */

const webpack = require('webpack');
const webpackServerConfig = require('./webpack.config.server').default;

const compiler = webpack(webpackServerConfig);

compiler.run((err, stats) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error(info.errors);

    return;
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings);
  }

  // Запустим наш сервер..
  require('../build/server');
});
