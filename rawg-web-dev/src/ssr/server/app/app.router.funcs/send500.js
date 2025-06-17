/* eslint-disable global-require */

import * as Sentry from '@sentry/node';

import config from 'config/config';

import logger from '../../tools/logger';

let internalServerErrorTemplate = 'Internal server error';

if (config.ssr) {
  internalServerErrorTemplate = require('../internal-server-error.html');
}

export default function send500({ request, response, error }) {
  logger.error({ message: error.message, url: request.originalUrl, stack: error.stack });
  response.status(500).send(internalServerErrorTemplate);
  Sentry.captureException(error);
}
