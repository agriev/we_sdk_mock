import path from 'path';
import env from '../../src/config/env';

const imageWebpackLoader = {
  loader: 'image-webpack-loader',
  options: {
    bypassOnDebug: true,
    svgo: {
      plugins: [{ removeViewBox: false }],
    },
  },
};

const imgFileLoader = {
  loader: 'file-loader',
  options: {
    name: 'images/[name].[ext]?v=[hash]',
  },
};

const imgUrlLoader = {
  loader: 'url-loader',
  options: {
    limit: 30192,
    fallback: 'file-loader',
    name: 'images/[name].[ext]?v=[hash]',
  },
};

const svgUrlLoader = {
  loader: 'svg-url-loader',
  options: {
    limit: 30192,
  },
};

export const imageLoaders = [
  // В данный момент на убунту не получается корректно сжимать jpeg'и этим плагином,
  // к сожалению, поэтому пока что разделяем на два отдельных блока обработку картинок,
  // пока баг не будет поправлен
  // https://github.com/tcoopman/image-webpack-loader/issues/142
  {
    test: /\.(png|gif)$/,
    use: [imgUrlLoader, imageWebpackLoader],
  },
  {
    test: /\.(jpe?g)$/,
    use: [imgFileLoader, imageWebpackLoader],
  },
  {
    test: /\.svg$/,
    oneOf: [
      {
        resourceQuery: /external/,
        use: [svgUrlLoader, imageWebpackLoader],
      },
      {
        use: ['raw-loader', imageWebpackLoader],
      },
    ],
  },
  {
    test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: 'fonts/[name].[ext]?v=[hash]',
        },
      },
    ],
  },
];

export const stylusLoader = {
  loader: 'stylus-loader',
  options: {
    sourceMap: env.isDev(),
  },
};

export const sharedStylLoaders = (mode) => [
  {
    loader: 'css-loader',
    options: {
      sourceMap: env.isDev() && mode === 'client',
      localsConvention: 'camelCase',
      onlyLocals: mode === 'server',
      importLoaders: 2,
      modules: false,
    },
  },
  {
    loader: 'postcss-loader',
    options: {
      sourceMap: env.isDev(),
      config: {
        path: path.resolve('./webpack/postcss.config.js'),
      },
    },
  },
];
