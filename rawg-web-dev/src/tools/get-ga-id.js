import cookies from 'browser-cookies';

const GA_COOKIE_KEY = '_ga';

function getGAId(requestCookies) {
  if (typeof window !== 'undefined') {
    return cookies.get(GA_COOKIE_KEY);
  }

  return (requestCookies || {})[GA_COOKIE_KEY];
}

export default getGAId;
