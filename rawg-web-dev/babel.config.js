/* eslint-disable no-template-curly-in-string, func-names */

module.exports = function(api) {
  if (api) {
    api.cache(true);
  }

  const presets = ['@babel/preset-env', '@babel/preset-react'];
  const plugins = [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import',
    // ['babel-plugin-universal-import', { babelServer: true }],
    'babel-plugin-universal-import',
    [
      'module-resolver',
      {
        root: './src',
      },
    ],
  ];

  if (process.env.NODE_ENV !== 'production') {
    return {
      presets,
      plugins: [
        ...plugins,
        'react-hot-loader/babel',
        '@babel/plugin-transform-react-jsx-source',
        '@babel/plugin-transform-react-jsx-self',
      ],
    };
  }

  return {
    presets,
    plugins: [
      ...plugins,
      [
        'transform-imports',
        {
          'redux-form': {
            transform: 'redux-form/lib/${member}',
            preventFullImport: true,
          },
          'react-router': {
            transform: 'react-router/lib/${member}',
            preventFullImport: true,
          },
          lodash: {
            transform: 'lodash/${member}',
            preventFullImport: true,
          },
          ramda: {
            transform: 'ramda/src/${member}',
            preventFullImport: true,
          },
        },
      ],
      'babel-plugin-transform-react-remove-prop-types',
      '@babel/plugin-transform-react-constant-elements',
    ],
  };
};
