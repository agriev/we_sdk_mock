import path from 'path';

const resolve = {
  modules: [path.resolve('./src'), 'node_modules'],
  symlinks: false,
  cacheWithContext: false,
  extensions: ['.js', '.json'],
  alias: {
    'lodash-es': 'lodash',
    // ssr: path.resolve(__dirname, '../src/ssr/'),
  },
};

export default resolve;
