const url = require('url');

function getUrlObject(request) {
  return {
    protocol: request.protocol,
    host: request.get('host'),
    pathname: request.path,
    query: request.query,
  };
}

export default function(request, res, next) {
  const urlObject = getUrlObject(request);
  let { pathname } = urlObject;

  if (pathname.length > 1) {
    pathname = pathname.replace(/\/$/, '');
    pathname = pathname.replace(/\/{2,}/g, '/');
  }

  const processedUrl = {
    ...urlObject,
    pathname,
  };

  if (url.format(urlObject) !== url.format(processedUrl)) {
    return res.redirect(301, url.format(processedUrl));
  }

  return next();
}
