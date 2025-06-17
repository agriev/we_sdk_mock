/* eslint-disable camelcase, sonarjs/no-small-switch */

import Express from 'express';
import passport from 'passport';
import FacebookStrategy from 'passport-facebook';
import TwitterStrategy from 'passport-twitter';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import { Strategy as SteamStrategy } from 'passport-steam';
import * as Sentry from '@sentry/node';

import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';
import T from 'ramda/src/T';

import fetch from 'tools/fetch';

import { AUTH_PROVIDER_MESSAGE, AUTH_PROVIDER_MESSAGE_ERROR } from 'app/pages/app/app.actions';

import socialAccountsHelper from 'app/components/social-accounts/social-accounts.helper';
import socialAuthConfig from './social-auth.config';

const providers = ['facebook', 'twitter', 'steam', 'vk'];

const locales = ['ru', 'en'];

const getStrategyName = (provider, locale) => `${provider}-${locale}`;

const getOptions = cond([
  [
    equals('facebook'),
    always({
      display: 'popup',
      scope: ['email'],
    }),
  ],
  [
    equals('vk'),
    always({
      scope: ['email'],
    }),
  ],
  [T, always({})],
]);

const getCallbackOptions = cond([
  [
    equals('vk'),
    always({
      failureRedirect: '/login',
      scope: ['email'],
    }),
  ],
  [T, always({})],
]);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((object, done) => {
  done(null, object);
});

locales.forEach((locale) => {
  passport.use(
    getStrategyName('facebook', locale),
    new FacebookStrategy(socialAuthConfig.facebook[locale], (access_token, refresh_token, profile, done) => {
      done(null, { access_token });
    }),
  );

  passport.use(
    getStrategyName('twitter', locale),
    new TwitterStrategy(socialAuthConfig.twitter[locale], (access_token, access_secret, profile, done) => {
      done(null, { access_token, access_secret });
    }),
  );

  passport.use(
    getStrategyName('steam', locale),
    new SteamStrategy(socialAuthConfig.steam[locale], (open_id, profile, done) => {
      done(null, { open_id, key: socialAuthConfig.steam[locale].apiKey });
    }),
  );

  passport.use(
    getStrategyName('vk', locale),
    new VKontakteStrategy(socialAuthConfig.vk[locale], (access_token, refresh_token, params, profile, done) => {
      const { email } = params;
      done(null, { access_token, email });
    }),
  );
});

const router = Express.Router();

const authFirstStep = (request, res, next) => (error, user) => {
  if (error) {
    Sentry.captureException(error);
    return next(error);
  }

  if (!user) {
    return res.redirect('/login');
  }

  request.logIn(user, (loginError) => {
    if (loginError) {
      Sentry.captureException(loginError);
      return next(loginError);
    }
    return res.redirect('/');
  });

  return res.redirect('/login');
};

const registerProvider = (provider, locale) => {
  router.get(socialAccountsHelper.getProviderPath(provider, locale), (request, res, next) => {
    const authFunc = passport.authenticate(
      getStrategyName(provider, locale),
      getOptions(provider),
      authFirstStep(request, res, next),
    );
    authFunc(request, res, next);
  });

  function generateState(request) {
    const { headers, cookies = {}, query, connection } = request;

    return {
      app: {
        request: {
          headers: {
            ...headers,
            'Referer-Referer': cookies.referer,
          },
          cookies,
          query,
          connection: {
            remoteAddress: connection.remoteAddress,
          },
        },
        token: cookies.token,
        locale,
      },
    };
  }

  router.get(
    socialAccountsHelper.getProviderCallbackPath(provider, locale),
    passport.authenticate(getStrategyName(provider, locale), getCallbackOptions(provider)),
    (request, response) => {
      const state = generateState(request);

      fetch(`/api/auth/${provider}`, {
        method: 'post',
        data: request.user,
        state,
      })
        .then((fetchRes) => {
          const message = {
            type: AUTH_PROVIDER_MESSAGE,
            res: fetchRes,
          };

          response.set('Content-Type', 'text/html');
          response.send(`<script>window.opener.postMessage(${JSON.stringify(message)}, '*');window.close()</script>`);
        })
        .catch((error) => {
          const message = {
            type: AUTH_PROVIDER_MESSAGE_ERROR,
            error,
          };

          response.set('Content-Type', 'text/html');
          response.send(`<script>window.opener.postMessage(${JSON.stringify(message)}, '*');window.close()</script>`);

          throw error;
        });
    },
  );
};

providers.forEach((provider) => {
  locales.forEach((locale) => {
    registerProvider(provider, locale);
  });
});

export default router;
