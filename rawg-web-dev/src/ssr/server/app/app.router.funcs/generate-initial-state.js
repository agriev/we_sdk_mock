import userAgentParser from 'ua-parser-js';

import startsWith from 'lodash/startsWith';
import defaultTo from 'lodash/defaultTo';

import env from 'config/env';
import reqHandler from 'tools/request-handler';
import config from 'config/config';

import { initialState as appInitialState } from 'app/pages/app/app.reducer';
import { initialState as currentUserInitialState } from 'app/components/current-user/current-user.reducer';

import { themeCookieKey } from 'app/components/theme-switcher/theme-switcher.actions';
import { defaultTheme, defaultOnlyMyPlatforms } from 'app/pages/app/app.consts';

import { onlyMyPlatformsCookieKey } from 'app/components/switcher-only-my-platforms/switcher.actions';

import generateMessages from './generate-messages';

function detectSize({ request }) {
  if (request.get('x-is-mobile')) {
    return request.get('x-is-mobile') === '1' ? 'phone' : 'desktop';
  }

  const ua = userAgentParser(reqHandler.getUserAgent(request));
  const { device, os } = ua;

  const phoneSizeTypes = ['tablet', 'mobile'];
  const phoneSizeOS = ['Android', 'BlackBerry', 'Firefox OS', 'iOS', 'Symbian', 'Windows [Phone/Mobile]'];

  return phoneSizeTypes.includes(device.type) || phoneSizeOS.includes(os.name) ? 'phone' : 'desktop';
}

function detectTheme({ request }) {
  const cookieTheme = request.cookies[themeCookieKey];

  return defaultTo(cookieTheme, defaultTheme);
}

function detectShowOnlyMyPlatforms({ request }) {
  const cookieOnlyMyPlatforms = request.cookies[onlyMyPlatformsCookieKey];

  if (cookieOnlyMyPlatforms !== undefined) {
    return cookieOnlyMyPlatforms === 'true';
  }

  return defaultOnlyMyPlatforms;
}

export function getLocaleFromRequest(request) {
  const queryLocale = env.isDev() ? request.query.locale : undefined;
  const localeFromRequest = request.get('x-language') || queryLocale;

  return defaultTo(localeFromRequest, config.locale);
}

function generateInitialState({ request, generatedMessages }) {
  const { headers, cookies = {}, query, connection, responseStatus } = request;
  const locale = getLocaleFromRequest(request);

  const messages = config.ssr ? generatedMessages : generateMessages();
  const size = detectSize({ request });
  const theme = detectTheme({ request });
  const showOnlyMyPlatforms = detectShowOnlyMyPlatforms({ request });
  const isSpider = request.get('x-is-spider') ? request.get('x-is-spider') === '1' : request.isSpider();
  const { path } = request;
  const embedded = startsWith(request.path, '/embeds');

  return {
    app: {
      ...appInitialState,
      token: cookies.token,
      request: {
        headers,
        cookies,
        query,
        connection: {
          remoteAddress: connection.remoteAddress,
        },
        responseStatus,
        isSpider,
        path,
      },
      status: responseStatus,
      messages: messages[locale],
      size,
      locale,
      embedded,
      settings: {
        theme,
        showOnlyMyPlatforms,
      },
    },
    currentUser: {
      ...currentUserInitialState,
    },
  };
}

export default generateInitialState;
