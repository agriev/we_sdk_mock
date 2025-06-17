/* eslint-disable import/no-mutable-exports */

import env from './env';

const getEnvironment = (key, def) => (process && process.env[key]) || def;

const port = getEnvironment('PORT', '4000');
const host = getEnvironment('HOSTNAME', '0.0.0.0');

const defaultClientAddress = env.isDev() ? `http://${host}:${port}` : 'https://ag.ru';
const defaultSSR = env.isDev() ? 'false' : 'true';
const defaultApiAddr = env.isDev() ? 'https://dev.ag.ru' : 'https://ag.ru';
const defaultAuthLink = env.isDev() ? 'https://embed.dev.ag.ru/auth/login' : 'https://embed.ag.ru/auth/login';
const defaultRegisterLink = env.isDev() ? 'https://embed.dev.ag.ru/auth/register' : 'https://embed.ag.ru/auth/register';
const defaultLogoutLink = env.isDev() ? 'https://embed.dev.ag.ru/auth/logout' : 'https://embed.ag.ru/auth/logout';
const defaultAuthCookieName = env.isDev() ? 'gsid_rc' : 'gsid';

let config = {
  assetsPath: getEnvironment('CDN_URL', '/assets/'),
  socialAuthPath: '/social-auth/',
  authCookieName: getEnvironment('AUTH_COOKIE_NAME', defaultAuthCookieName),
  clientAddress: {
    ru: getEnvironment('CLIENT_ADDRESS_RU', defaultClientAddress),
    en: getEnvironment('CLIENT_ADDRESS_EN', defaultClientAddress),
  },
  authLink: getEnvironment('CLIENT_AUTH_LINK', defaultAuthLink),
  registerLink: getEnvironment('CLIENT_REGISTER_LINK', defaultRegisterLink),
  logoutLink: getEnvironment('CLIENT_LOGOUT_LINK', defaultLogoutLink),
  // Во время разработки можно просить webpack полностью перезагружать всю страницу
  hotreload: env.isDev() ? process.env.HOTRELOAD || 'false' : false,

  ssr: getEnvironment('SSR', defaultSSR) === 'true',
  devLogs: env.isDev(),
  disableJSForSpiders: getEnvironment('DISABLE_JS_FOR_SPIDERS', 'true') === 'true',
  prefetchJS: getEnvironment('PREFETCH_JS', 'false') === 'true',
  prefetchStyles: getEnvironment('PREFETCH_STYLES', 'false') === 'true',

  locales: ['en', 'ru'],
  fallbackLocale: 'ru',
  locale: getEnvironment('LOCALE', 'ru'),

  appEnv: getEnvironment('APP_ENV', 'local'),
  apiAddress: {
    ru: getEnvironment('API_ADDRESS_RU', defaultApiAddr),
    en: getEnvironment('API_ADDRESS_EN', defaultApiAddr),
  },
  pusherKey: getEnvironment('PUSHER_KEY', '3e10bb5b136c02fb261e'),
  wsHost: getEnvironment('WS_HOST', 'poxa.ag.ru'),
  sentryEnabled: getEnvironment('SENTRY_ENABLED') === 'true',
  sentryPublicUrl: getEnvironment('SENTRY_PUBLIC_URL'),
  newRelicNodejsEnable: getEnvironment('NEWRELIC_NODEJS_ENABLE') === 'true',
  newRelicFrontendEnable: getEnvironment('NEWRELIC_FRONTEND_ENABLE') === 'true',
  newRelicFrontendAppName: getEnvironment('NEWRELIC_FRONTEND_APPNAME'),

  rawgApiKey: getEnvironment('RAWG_API_KEY', '1287fbd232d14b00b7af6b11868f9c6b'),

  bundleAnalyzerEnabled: getEnvironment('BUNDLE_ANALYZER_ENABLED') === 'true',
  optimizationEnabled: getEnvironment('OPTIMIZATION_ENABLED', 'false') === 'true',
  analyticsEnabled: getEnvironment('ANALYTICS') === 'true',
  // Функции проекта, которые можно включить/выключить:
  features: {
    tokens: getEnvironment('TOKENS') === 'true',
    tokensExchange: getEnvironment('TOKENS_EXCHANGE') === 'true',
    tokensBanner: getEnvironment('TOKENS_BANNER') === 'true',
    stories: getEnvironment('STORIES', 'true') === 'true',
    showcaseRecent: getEnvironment('SHOWCASE_RECENT', 'true') === 'true',
    suggestions: getEnvironment('SUGGESTIONS', 'false') === 'true',
    discover: getEnvironment('DISCOVER', 'true') === 'true',
    discoverNewMain: getEnvironment('DISCOVER_NEW_MAIN', 'true') === 'true',
    imgur: getEnvironment('IMGUR', 'false') === 'true',
  },

  loggerGroups: {
    stories: getEnvironment('STORIES_LOGS') === 'true',
    ga: getEnvironment('GOOGLE_ANALYTICS_LOGS', 'true') === 'true',
    ssrPerfomance: getEnvironment('SSR_PERFOMANCE_LOGS') === 'true',
    cachedFetchs: getEnvironment('CACHED_FETCHS_LOGS') === 'true',
    fetchs: getEnvironment('CONSOLE_FETCH_LOGS', 'false'),
    fetchsServerSlow: parseFloat(getEnvironment('CONSOLE_FETCH_LOGS_SERVER_SLOW', '0.3')),
    fetchsBrowserSlow: parseFloat(getEnvironment('CONSOLE_FETCH_LOGS_BROWSER_SLOW', '1')),
    rateGames: getEnvironment('RATE_GAMES_LOGS', 'false') === 'true',
  },

  // Промо акции, которые немного меняют внешний вид сайта
  // и могут быть включены/выключены время от времени:
  promos: {
    e3: false,
    gamescom: false,
  },

  private: {
    buildPath: './build',
    serverHostname: host,
    serverPort: port,
    serverAddress: `http://${host}:${port}`,
    serverApiAddress: getEnvironment('SERVER_API_ADDRESS', defaultApiAddr),
  },

  // Add errors for ignoring in sentry in string or regExp format
  sentryIgnoreErrors: ['You should be an authorized user', 'Failed to fetch'],
  rcLogin: 'RC',
  rcPassword: 'tx4fbb6eYl38',
};

if (env.isClient()) {
  ({ config } = window.CLIENT_PARAMS);
}

export default config;
