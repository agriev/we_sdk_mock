/* eslint-disable no-console, global-require */

const path = require('path');
const ip = require('ip');
const detector = require('tools/spider-detector');
const Sentry = require('@sentry/node');
const compression = require('compression');

const colors = require('colors/safe');
const Express = require('express');
const helmet = require('helmet');
const expressWinston = require('express-winston');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const passport = require('passport');

const config = require('config/config').default;

require('heapdump');
require('full-icu');

if (config.newRelicNodejsEnable) {
  require('newrelic');
}

const environment = require('config/env').default;
const appRouter = require('./app/app.router').default;
const logger = require('./tools/logger').default;
const redirectsHandler = require('./tools/redirects-handler').default;
const socialAuthRouter = require('./social-auth/social-auth.router').default;

const sessionCookie = require('./middleware/session-cookie').default;

global.Intl = require('intl');
global.DOMParser = require('xmldom').DOMParser;

if (!Intl.PluralRules) {
  require('@formatjs/intl-pluralrules/polyfill');
  require('@formatjs/intl-pluralrules/dist/locale-data/ru');
  require('@formatjs/intl-pluralrules/dist/locale-data/en');
}

if (!Intl.RelativeTimeFormat) {
  require('@formatjs/intl-relativetimeformat/polyfill');
  require('@formatjs/intl-relativetimeformat/dist/locale-data/ru');
  require('@formatjs/intl-relativetimeformat/dist/locale-data/en');
}

if (config.sentryEnabled) {
  Sentry.init({
    dsn: config.sentryPublicUrl,
    environment: 'nodejs-server',
    release: RAWG_RELEASE,
    beforeSend(event) {
      console.log('event captured by sentry', event);

      return event;
    },
  });
}

const app = Express();

if (config.sentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
}

/* Cookies */
app.use(cookieParser());

/* Spiders Detector */
app.use(detector.middleware());

app.use(redirectsHandler);

/* Security */
app.use(
  helmet({
    hsts: false,
    noCache: true,
  }),
);

/* Session */
const sessionOptions = {
  secret: 'RAWG',
  name: 'session',
};

if (environment.isProd()) {
  app.set('trust proxy', 1);
  sessionOptions.secure = false;
}

app.use(cookieSession(sessionOptions));
app.use(compression());
app.use(sessionCookie);

/* Webpack */
let compiler = null;

if (environment.isDev()) {
  /* DEV */
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const webpackClientConfig = require('../../../webpack/webpack.config.client').default;

  compiler = webpack(webpackClientConfig);

  app.use(
    webpackDevMiddleware(compiler, {
      logLevel: 'silent',
      publicPath: webpackClientConfig.output.publicPath,
    }),
  );

  app.use(webpackHotMiddleware(compiler, { log: false }));
} else if (config.assetsPath.startsWith('/')) {
  app.use(config.assetsPath, Express.static(path.resolve(config.private.buildPath)));
}

/* SOCIAL AUTH */
app.use(passport.initialize());
app.use(passport.session());
app.use(config.socialAuthPath, socialAuthRouter);

/* Timeout */
app.use((request, res, next) => {
  request.setTimeout(25000);
  res.on('timeout', () => {
    if (!res.headersSent) {
      res.status(504).send('504 Timeout');
    }
  });
  next();
});

/* APP */
app.use('/', appRouter(compiler));

/* Logger */
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    meta: false,
    colorize: true,
    msg: environment.isDev()
      ? 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms'
      : 'HTTP {{req.method}} {{req.hostname}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms {{req.headers["user-agent"]}}',
  }),
);

if (config.sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

/* Run */
console.info(colors.blue.bold('Run express server..'));

const server = app.listen(config.private.serverPort, config.private.serverHostname, () => {
  const localAddress = `http://${config.private.serverHostname}:${config.private.serverPort}`;
  const ipAddress = `http://${ip.address()}:${config.private.serverPort}`;

  console.info(colors.green.bold('Server is running'));
  console.info(colors.green.bold('NODE_ENV'), colors.red.bold(process.env.NODE_ENV));
  console.info(colors.green.bold('Address:'), server.address());
  console.info(colors.green.bold('Urls:'), colors.red.bold(`${localAddress}, ${ipAddress}`));
  console.info(colors.green.bold('Config:'), colors.red.bold(JSON.stringify(config, null, '  ')));

  if (environment.isDev()) {
    console.info(colors.blue.bold('Start build..'));
  }
});
