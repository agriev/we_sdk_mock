const spiders = [
  /bot/i,
  /spider/i,
  /facebookexternalhit/i,
  /simplepie/i,
  /yahooseeker/i,
  /embedly/i,
  /quora link preview/i,
  /outbrain/i,
  /vkshare/i,
  /monit/i,
  /pingability/i,
  /monitoring/i,
  /winhttprequest/i,
  /apache-httpclient/i,
  /getprismatic.com/i,
  /python-requests/i,
  /twurly/i,
  /yandex/i,
  /browserproxy/i,
  /crawler/i,
  /qwantify/i,
  /yahoo! slurp/i,
  /pinterest/i,
  /tumblr\/14.0.835.186/i,
  /tumblr agent 14.0/i,
  /lighthouse/i,
];

export function isSpider(ua) {
  return spiders.some((spider) => spider.test(ua));
}

export function middleware() {
  return (request, response, next) => {
    request.isSpider = isSpider.bind(undefined, request.get('user-agent'));
    next();
  };
}
