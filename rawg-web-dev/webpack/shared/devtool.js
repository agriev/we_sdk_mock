import env from '../../src/config/env';

const devtool = env.isDev() ? 'eval-source-map' : 'source-map';

export default devtool;
