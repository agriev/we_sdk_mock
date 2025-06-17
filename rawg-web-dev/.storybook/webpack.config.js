const path = require('path');
const webpack = require('webpack');

// you can use this file to add your custom webpack plugins, loaders and anything you like.
// This is just the basic way to add additional webpack configurations.
// For more information refer the docs: https://storybook.js.org/configurations/custom-webpack-config

// IMPORTANT
// When you add this file, we won't add the default configurations which is similar
// to "React Create App". This only has babel loader to load JavaScript.
const sharedClientStylLoaders = [
  {
    loader: 'css-loader',
    query: { minimize: false },
  },
  {
    loader: 'postcss-loader',
    options: {
      config: {
        path: path.resolve('./webpack/postcss.config.js'),
      },
    },
  },
];

const sharedStylusOptions = {
  import: [
    path.resolve('./src/shared/app/shared/ui/styles/vars.styl'),
    path.resolve('./src/shared/app/shared/ui/styles/mixins.styl'),
    path.resolve('./src/shared/app/shared/ui/styles/flex-helpers.styl'),
    path.resolve('./src/shared/app/shared/ui/styles/keyframes.styl'),
    path.resolve('./src/shared/app/app/app.styl'),
  ],
};

const sharedClientPlugins = [
  new webpack.LoaderOptionsPlugin({
    minimize: false,
    options: {
      stylus: sharedStylusOptions,
    },
  }),
];

module.exports = {
  plugins: [...sharedClientPlugins],
  resolve: {
    modules: [path.resolve('./src'), 'node_modules'],
    symlinks: false,
    cacheWithContext: false,
    alias: {
      'lodash-es': 'lodash',
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['thread-loader', 'cache-loader', 'babel-loader'],
      },
      {
        test: /\.styl$/,
        use: ['style-loader', ...sharedClientStylLoaders, 'stylus-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', ...sharedClientStylLoaders],
      },
      {
        test: /\.(woff2?|jpe?g|png|gif)$/,
        use: ['file-loader'],
      },
      {
        test: /\.svg$/,
        oneOf: [
          {
            resourceQuery: /external/,
            use: 'file-loader',
          },
          {
            use: 'raw-loader',
          },
        ],
      },
    ],
  },
};
