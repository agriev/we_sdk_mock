/* eslint-disable no-use-before-define, no-console, global-require, sonarjs/cognitive-complexity */
/* global FormData */

import startsWith from 'lodash/startsWith';
import urlParse from 'url-parse';
import colors from 'colors/safe';
import { encode } from 'base-64';

import map from 'lodash/map';

import compactObject from 'tools/compact-object';
import getPathFromLocation from 'tools/get-path-from-location';

import env from 'config/env';
import config from 'config/config';
import Error404 from 'interfaces/error-404';

import appHelper from 'app/pages/app/app.helper';
import reqHandler from './request-handler';
import { isFlutter } from './is-flutter';

const location = env.isClient() ? window.location : null;
const isDev = env.isDev();

const timeDiff = (date) => (new Date(new Date() - date).getTime() / 1000).toFixed(2);

const isomorphicFetch = env.isClient() ? window.fetch : require('node-fetch');

// Fix window.location.origin for IE < 11
if (location && !location.origin) {
  const { protocol, hostname, port } = location;
  location.origin = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

export default async function fetch(
  uri,
  {
    method = 'get',
    data: dataArgument,
    multipart = false,
    checkResult = true,
    returnBeforeParse,
    sendCurrentPageInsteadPrevious = false,
    parse = true,
    token,
    state,
    headers,
  } = {},
) {
  const { locale } = state.app;
  const timeStart = new Date();
  const data = compactObject(dataArgument);

  let fetchUri = generateFetchUri(uri, { method, data, locale });

  const fetchOptions = generateFetchOptions({
    uri,
    method,
    data,
    state,
    multipart,
    token,
    headers,
    sendCurrentPageInsteadPrevious,
  });

  const userAgent = env.isClient() ? navigator.userAgent : reqHandler.getUserAgent(state.request);

  let playOnDevice = 'play_on_desktop';

  if (isFlutter(userAgent) || appHelper.isPhoneSize(state.app.size)) {
    playOnDevice = 'play_on_mobile';
  }

  fetchUri = new URL(fetchUri);
  fetchUri.searchParams.set(playOnDevice, 'true');
  fetchUri = fetchUri.toString();

  const response = await isomorphicFetch(fetchUri, fetchOptions);

  const timeToFirstByte = new Date();

  return processResult({
    uri,
    method,
    data,
    response,
    parse,
    checkResult,
    timeStart,
    timeToFirstByte,
    returnBeforeParse,
  });
}

async function processResult({
  uri,
  method,
  data,
  response,
  timeStart,
  timeToFirstByte,
  parse = true,
  checkResult = true,
  returnBeforeParse,
}) {
  const isNormalResponse = (response.status >= 200 && response.status < 400) || !checkResult;
  const ttfbDuration = timeDiff(timeStart);
  let result;

  if (returnBeforeParse) {
    return response;
  }

  if (isNormalResponse) {
    result = parse && response.status !== 204 ? await response.json() : response;
  }

  if (config.loggerGroups.fetchs && config.loggerGroups.fetchs !== 'false') {
    const downloadDuration = timeDiff(timeToFirstByte);
    const allDuration = timeDiff(timeStart);
    const { status } = response;

    const showAllLogs = config.loggerGroups.fetchs === 'all';
    const showSlowLogs =
      config.loggerGroups.fetchs === 'slow' &&
      ((env.isServer() && allDuration >= config.loggerGroups.fetchsServerSlow) ||
        (env.isClient() && allDuration >= config.loggerGroups.fetchsBrowserSlow));

    if (showAllLogs || showSlowLogs) {
      if (env.isServer()) {
        const durationColor = allDuration < config.loggerGroups.fetchsServerSlow ? colors.green : colors.red;
        const statusColor = status >= 200 && status < 400 ? colors.green : colors.red;
        console.info(
          durationColor(`${allDuration}s`),
          statusColor(status),
          method.toUpperCase(),
          uri,
          `(${ttfbDuration}s ttfb + ${downloadDuration}s download)`,
        );
      } else {
        const durationColor = allDuration < config.loggerGroups.fetchsBrowserSlow ? '#bada55' : '#e36c6c';
        const statusColor = status >= 200 && status < 400 ? '#bada55' : '#e36c6c';
        console.log(
          `%c${allDuration}s %c${status}`,
          `color: ${durationColor}`,
          `color: ${statusColor}`,
          method.toUpperCase(),
          uri,
          `(${ttfbDuration}s ttfb + ${downloadDuration}s download)`,
        );
      }
    }
  }

  if (isNormalResponse) {
    return result;
  }

  if (response.status === 404) {
    throw new Error404();
  }

  let errors;

  try {
    const jsonResponse = await response.json();
    errors = { ...jsonResponse };
  } catch (error) {
    console.error(error);

    errors = { statusText: response.statusText };
  }

  console.error(`Error on fetching ${method}:${uri}`, {
    errors,
    status: response.status,
    data,
  });

  const error = new Error(`Error on fetching ${method}:${uri}. Status: ${response.status} ${response.statusText}`);

  error.errors = errors;
  error.status = response.status;

  throw error;
}

function generateFetchUri(uri, { method, data: dataArgument, locale }) {
  let address = env.isClient() ? location.origin : config.private.serverAddress;
  const data = { ...dataArgument, key: config.rawgApiKey };

  if (startsWith(uri, 'https') || startsWith(uri, 'http')) {
    return uri;
  }

  if (startsWith(uri, '/api/')) {
    if (env.isServer()) {
      address = config.private.serverApiAddress;
    } else {
      address = config.apiAddress[locale];
    }
  }

  let params = '';

  if (method.toLowerCase() === 'get') {
    params = `${uri.includes('?') ? '&' : '?'}${getDataAsParams(data)}`;
  }

  return `${address}${uri}${params}`;
}

export function parseCookies(input = '') {
  // eslint-disable-next-line no-param-reassign
  input = input.trim();

  if (input.length === 0) {
    return {};
  }

  return Object.fromEntries(input.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)));
}

function generateFetchOptions({
  uri,
  method,
  data,
  state = {},
  multipart,
  token,
  headers: headersArgument,
  sendCurrentPageInsteadPrevious,
}) {
  const { app = {} } = state;
  const { locale, request, token: tokenFromState, previousPage } = app;

  const isApiRequest = startsWith(uri, '/api/');

  const options = {};
  const headers = {
    'X-API-Language': locale,
  };

  const cookies = parseCookies(env.isClient() ? document.cookie : reqHandler.getCookies(request));

  if (tokenFromState || token) {
    headers.Token = `Token ${tokenFromState || token}`;
  }

  if (!multipart) {
    headers.Accept = 'application/json';
    headers['Content-Type'] = 'application/json';
  }

  if (env.isServer()) {
    headers.Cookie = reqHandler.getCookies(request);
    headers['Accept-Language'] = reqHandler.getAcceptLanguage(request);
    headers['User-Agent'] = reqHandler.getUserAgent(request);
    headers['X-Forwarded-For'] = reqHandler.getRemoteAddress(request);

    if (isApiRequest) {
      headers['X-Host'] = urlParse(config.apiAddress[locale]).host;
      headers['X-API-Referer'] = encodeURIComponent(request.path);
    }
  }

  if (isDev) {
    headers.Authorization = `Basic ${encode(`${config.rcLogin}:${config.rcPassword}`)}`;
  }

  if (env.isClient() && isApiRequest) {
    const path = sendCurrentPageInsteadPrevious ? getPathFromLocation(window.location) : previousPage;

    headers['X-API-Referer'] = encodeURIComponent(path);
  }

  if (isApiRequest) {
    headers['X-API-Client'] = 'website';
  }

  if (method.toLowerCase() !== 'get' && data) {
    options.body = multipart ? getDataAsForm(data) : getDataAsJson(data);
  }

  if (cookies.csrftoken) {
    headers['X-CSRFToken'] = cookies.csrftoken;
  }

  return {
    method: method.toUpperCase(),
    headers: {
      ...headers,
      ...headersArgument,
    },
    credentials: 'include', // send cookies
    ...options,
  };
}

function getDataAsParams(data) {
  return map(
    data,
    (value, key) => {
      if (Array.isArray(value)) {
        return `${key}=${value.map((value_) => encodeURIComponent(value_)).join(',')}`;
        // return value.map(value => `${key}[]=${encodeURIComponent(value)}`).join('&');
      }
      return `${key}=${encodeURIComponent(value)}`;
    },
    this,
  ).join('&');
}

function getDataAsJson(data) {
  return JSON.stringify(data);
}

function getDataAsForm(data) {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (Array.isArray(value)) {
      value.forEach((arrayValue) => {
        formData.append(key, arrayValue);
      });
    } else {
      formData.append(key, data[key]);
    }
  });

  return formData;
}
