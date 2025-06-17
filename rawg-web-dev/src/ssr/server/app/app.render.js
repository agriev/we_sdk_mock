/* eslint-disable no-console */

import serialize from 'serialize-javascript';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { RouterContext } from 'react-router';
import cn from 'classnames';

import startsWith from 'lodash/startsWith';

import applyTo from 'ramda/src/applyTo';

import { clearChunks, flushChunkNames } from 'react-universal-component/server';
import flushChunks from 'webpack-flush-chunks';

import { getJsPrefetches, getJSInits, getStylesPrefetches } from 'ssr/server/app/app.render.funcs.js';

import env from 'config/env';
import config from 'config/config';
import IntlWrapper from 'tools/intl-wrapper';
import { initAppPrepareFuncs } from 'tools/hocs/prepare';
import logPerfomance from 'tools/log-perfomance';
import facebookSDKInitCode from 'scripts/facebook-sdk.js';
import mailRuCounterInitCode from 'scripts/mailru-counter.js';

function generateClientParams({ request, store }) {
  const initialState = store.getState();

  return {
    config: {
      ...config,
      private: null,
    },
    environment: env.NODE_ENV,
    initialState: {
      ...initialState,
      app: {
        ...initialState.app,
        request: {
          ...initialState.app.request,
          headers: request.headers,
          cookies: request.cookies,
          connection: null,
          referer: request.headers.referer || null,
        },
        status: request.responseStatus,
        visited: request.session.visited,
      },
    },
  };
}

const renderContent = async ({ renderProperties, store }) => {
  const prepares = renderProperties.components
    .map((wrap) => wrap && wrap.component && wrap.component.prepare)
    .filter((prepare) => Boolean(prepare));

  // console.log({ prepares, comps: renderProps.components });

  const initAppPromise = initAppPrepareFuncs({ store });

  const preparePagePromises = async () => {
    logPerfomance.start('prepare.pageData');
    await Promise.all(prepares.map(applyTo({ store, initAppPromise, ...renderProperties })));
    logPerfomance.end('prepare.pageData');
  };

  await Promise.all([initAppPromise, preparePagePromises()]);

  const helmetContext = {};

  const app = (
    <HelmetProvider context={helmetContext}>
      <Provider store={store}>
        <IntlWrapper>
          <RouterContext {...renderProperties} />
        </IntlWrapper>
      </Provider>
    </HelmetProvider>
  );

  logPerfomance.start('ReactDOMServer.renderToString');
  const content = ReactDOMServer.renderToString(app);
  logPerfomance.end('ReactDOMServer.renderToString');

  const { helmet } = helmetContext;

  return { content, helmet };
};

let clientStats;

if (env.isProd()) {
  // eslint-disable-next-line global-require, import/no-unresolved
  clientStats = require('../../../../build/stats.json');

  // console.log(clientStats.namedChunkGroups);
}

export default async function renderApp({ request, response, status = 200, template, renderProperties, store }) {
  const firstState = store.getState();
  const disableJS = config.disableJSForSpiders && firstState.app.request.isSpider;

  request.responseStatus = status;

  if (env.isProd()) {
    clearChunks();
  }

  const { content = '', helmet = {} } = renderProperties ? await renderContent({ renderProperties, store }) : {};
  const { htmlAttributes = '', meta = '', title = '', link = '', script = '' } = helmet;

  let jsInits = '';
  let jsPrefetches = '';
  let styles = '';
  let stylesPrefetches = '';
  let cssHash = '';
  let scripts = [];
  let stylesheets = [];

  const bodyClasses = {
    embedded: startsWith(request.path, '/embeds'),
  };

  const bodyStart = '';

  if (env.isProd()) {
    const options = { chunkNames: flushChunkNames() };
    ({ styles, cssHash, scripts, stylesheets } = flushChunks(clientStats, options));

    jsPrefetches = config.prefetchJS ? getJsPrefetches(scripts) : '';
    stylesPrefetches = config.prefetchStyles ? getStylesPrefetches(stylesheets) : '';
    jsInits = getJSInits(scripts);

    // console.info({
    //   chunkNames: opts.chunkNames,
    //   styles: styles.toString(),
    //   js: js.toString(),
    // });
  }

  const clientParams = generateClientParams({ request, store });
  const clientParamsJS = `window.CLIENT_PARAMS = ${serialize(clientParams, {
    isJSON: true,
  })}`;

  logPerfomance.start('generateOutputAndSendToClient');

  const state = store.getState();
  // const { locale } = state.app;

  const bodyEnd = `
    ${jsInits}
  `;

  const html = template
    .replace('{{ BODY_CLASSES }}', cn(bodyClasses))
    .replace('{{ HTML_ATTRIBUTES }}', `${htmlAttributes.toString()}`)
    .replace('{{ HEAD }}', `${meta}${title}${link}${disableJS ? '' : script}`)
    .replace('{{ APP_CONTENT }}', content)
    .replace('{{ STYLES }}', styles)
    .replace('{{ STYLES_PREFETCHES }}', disableJS ? '' : stylesPrefetches)
    .replace('{{ SCRIPTS_PREFETCHES }}', disableJS ? '' : jsPrefetches)
    .replace('{{ CLIENT_PARAMS }}', disableJS ? '' : clientParamsJS)
    .replace('{{ BODY_START }}', disableJS ? '' : bodyStart)
    .replace('{{ BODY_END }}', disableJS ? '' : bodyEnd)
    .replace('{{ CSSHASH }}', disableJS ? '' : cssHash);

  if (!response.headersSent) {
    response.set(state.app.responseHeaders);
    response.status(state.app.status || status);
    response.send(html);
  }

  logPerfomance.end('generateOutputAndSendToClient');

  logPerfomance.end('entireRequest');
  if (config.loggerGroups.ssrPerfomance) {
    console.log(' ');
  }

  return true;
}
