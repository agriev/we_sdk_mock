import env from '../../src/config/env';
import config from '../../src/config/config';

const pathToClientJs = './src/ssr/client/client.js';

const entry = env.isDev()
  ? [
    'react-hot-loader/patch',
    `webpack-hot-middleware/client?reload=${config.hotreload}`,
    ...[pathToClientJs],
  ]
  : pathToClientJs;

export default entry;
