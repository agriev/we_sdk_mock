/* eslint-disable import/no-dynamic-require, global-require, no-restricted-globals */

import 'core-js/modules/es6.promise';
import 'core-js/modules/es6.array.fill';

import 'whatwg-fetch';

import ReactDOM from 'react-dom';
import { match } from 'react-router';
import 'intl';
import * as Sentry from '@sentry/browser';

import { setStatus, markSecondPage } from 'app/pages/app/app.actions';

import config from 'config/config';
import routes from 'config/routes';

import AppContainer from './app-container';
import store from './store';
import history from './history';
import initialState from './initial-state';

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

function handleHash() {
  if (!(location && location.hash)) return;

  const id = location.hash.replace('#', '');

  const waitForElementTimeout = 4000;
  const waitForElementStep = 200;
  let currentlyWaiting = 0;

  const waitForElement = setInterval(() => {
    const element = document.getElementById(id);
    if (element) {
      clearInterval(waitForElement);
      setTimeout(() => {
        element.scrollIntoView();
      }, 200);
    }
    if (currentlyWaiting >= waitForElementTimeout) clearInterval(waitForElement);
    currentlyWaiting += waitForElementStep;
  }, waitForElementStep);
}

if (config.sentryEnabled) {
  Sentry.init({
    dsn: config.sentryPublicUrl,
    release: RAWG_RELEASE,
    environment: 'web-client',
    beforeSend(event) {
      console.log('event captured by sentry', event);

      return event;
    },
  });

  if (initialState && initialState.currentUser && initialState.currentUser.id) {
    Sentry.setUser({
      email: initialState.currentUser.email,
      username: initialState.currentUser.full_name || initialState.currentUser.username,
      id: initialState.currentUser.id,
    });
  }
}

history.listen(() => {
  match({ routes, location }, (error /* , redirect , renderProps */) => {
    const state = store.getState();
    const { app } = state;
    const { firstRender, firstPage } = app;

    handleHash();

    if (firstRender) {
      return;
    }

    if (error) {
      store.dispatch(setStatus(500));
      /* eslint-disable no-console */
      console.log(error);
      // } else if (!renderProps) {
      //   store.dispatch(setStatus(404));
    } else if (state.app.status !== 200) {
      store.dispatch(setStatus(200));
    }

    if (firstPage) {
      store.dispatch(markSecondPage());
    }
  });
});

const render = (renderProperties = {}) => {
  ReactDOM[config.ssr ? 'hydrate' : 'render'](AppContainer(renderProperties), document.getElementById('root'));
};

if (config.ssr) {
  match({ history, routes }, (error, redirectLocation, renderProperties) => {
    render(renderProperties);
  });
} else {
  render();
}

setTimeout(() => {
  handleHash();
}, 500);
