import TerserPlugin from 'terser-webpack-plugin';

import compact from 'lodash/compact';

import env from '../../src/config/env';
import config from '../../src/config/config';

const optimization = {
  // runtimeChunk: 'single',
  noEmitOnErrors: env.isDev(),
  concatenateModules: env.isProd(),
  splitChunks: {
    chunks: 'async',
    minSize: 30000,
    minChunks: 1,
    maxAsyncRequests: 5,
    maxInitialRequests: 3,
    automaticNameDelimiter: '~',
    name: true,
    cacheGroups: {
      // Часто люди выделяют весь "вендорный" код проекта в отдельный чанк, но
      // с нашим проектом это может сказаться негативно на первичной загрузке
      // сайта новыми пользователями: им в обязательном порядке придётся скачать
      // все наши вендорные зависимости сайта - а их не так уж и мало. На 2018.11.27
      // размер этого чанка составляет 1.6мб. Он выходит самым жырным чанком в проекте.
      // И его приходится скачивать всем, с любой страницы. Поэтому, всё-таки, более
      // логично размазать все вендорные зависимости по тем страницам, на которых
      // они используются. Таким образом общий объём каждой страницы сократится,
      // клиентам придётся загружать меньше данных. Поэтому эти строки закомментированы:
      // vendors: {
      //   test: /[\\/]node_modules[\\/]/,
      //   name: 'vendors',
      //   chunks: 'all',
      // },
      // Есть возможность объединить стили в один большой и жырный CSS.
      // Но учитывая то, что наш сайт уже вырос в размерах и имеет много
      // страниц - вряд ли правильно загружать сразу все стили при первом
      // открытии сайта.
      // styles: {
      //   name: 'styles',
      //   test: /\.(css|styl)$/,
      //   chunks: 'all',
      //   enforce: true,
      // },
    },
  },
  minimizer: compact([
    config.optimizationEnabled &&
      new TerserPlugin({
        sourceMap: true,
        terserOptions: {
          compress: {
            ecma: 6,
            // если будут ошибки при сжатии - включите этот параметр для вывода полной информации
            // warnings: 'verbose',
          },
          output: {
            beautify: false,
            comments: false,
          },
        },
      }),
  ]),
};

export default optimization;
