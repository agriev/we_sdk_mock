/* eslint-disable global-require, no-shadow, no-console */

import { createMemoryHistory, match } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import * as Sentry from '@sentry/node';

import createStore from 'config/store';
import paths from 'config/paths';
import config from 'config/config';

import logger from '../../tools/logger';
import generateMessages from './generate-messages';
import generateInitialState from './generate-initial-state';
import send500 from './send500';

import renderApp from '../app.render';

const generatedMessages = generateMessages();

let routes;

if (config.ssr) {
  routes = require('config/routes').default;
}

async function matchRoute(url, history) {
  return new Promise((resolve) => {
    match({ history, routes, location: url }, (error, redirectLocation, renderProperties) => {
      resolve({ error, redirectLocation, renderProperties });
    });
  });
}

async function sendContent({ request, response, template }) {
  response.set('content-type', 'text/html');

  const memoryHistory = createMemoryHistory(request.url);
  const initialState = generateInitialState({ request, generatedMessages });
  const store = createStore(memoryHistory, initialState);
  const history = syncHistoryWithStore(memoryHistory, store);

  if (!config.ssr) {
    await renderApp({
      request,
      response,
      template,
      store,
      status: 200,
    });
    return;
  }

  const result = await matchRoute(request.originalUrl, history);

  const { error, redirectLocation } = result;
  let { renderProperties } = result;
  let status = 200;

  if (redirectLocation) {
    const { pathname, search, state } = redirectLocation;
    const responseCode = (state && state.responseCode) || 301;

    response.redirect(responseCode, `${pathname}${search}`);
    return;
  }

  if (error) {
    logger.error({
      message: error.message,
      url: request.originalUrl,
      stack: error.stack,
    });
    const props = await matchRoute(paths.internalServerError, history);
    renderProperties = props.renderProps; // eslint-disable-line prefer-destructuring
    status = 500;
  } else {
    status = renderProperties.routes.find((route) => route.path === '*') ? 404 : 200;
  }

  try {
    await renderApp({
      request,
      response,
      template,
      renderProperties,
      store,
      status,
    });
  } catch (renderError) {
    if (renderError.status === 404) {
      try {
        const { renderProperties } = await matchRoute(paths.notFoundError, history);
        await renderApp({
          request,
          response,
          template,
          renderProperties,
          store,
          status: 404,
        });
        return;
      } catch (error_) {
        send500({ request, response, error_ });
      }
    } else if (renderError.status === 301) {
      response.redirect(301, renderError.url);
    } else {
      try {
        const { renderProperties } = await matchRoute(paths.internalServerError, history);
        await renderApp({
          request,
          response,
          template,
          renderProperties,
          store,
          status: 500,
        });
      } catch (error_) {
        send500({ request, response, error_ });
      }

      console.log('Error on rendering content', renderError);

      if (config.sentryEnabled) {
        Sentry.captureException(renderError);
      }
    }
  }
}

export default sendContent;
