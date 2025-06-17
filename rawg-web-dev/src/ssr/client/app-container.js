import React from 'react';
import { Provider } from 'react-redux';
import { Router, applyRouterMiddleware } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import useScroll from 'react-router-scroll/lib/useScroll';

import IntlWrapper from 'tools/intl-wrapper';
import routes from 'config/routes';

import store from './store';
import history from './history';

const scrollBehavior = (previousRouterProperties, { routes: currentRoutes, location }) =>
  !currentRoutes.some((route) => route.ignoreScrollBehavior || (location.state && location.state.ignoreScrollBehavior));

const AppContainer = (renderProperties) => (
  <HelmetProvider>
    <Provider store={store}>
      <IntlWrapper>
        <Router
          {...renderProperties}
          routes={routes}
          history={history}
          render={applyRouterMiddleware(useScroll(scrollBehavior))}
        />
      </IntlWrapper>
    </Provider>
  </HelmetProvider>
);

export default AppContainer;
