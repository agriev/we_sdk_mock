export default {
  getHeaders(request) {
    return request && request.headers;
  },

  getRemoteAddress(request) {
    return request ? request.headers['x-forwarded-for'] || request.connection.remoteAddress : '';
  },

  getAcceptLanguage(request) {
    return request && request.headers['accept-language'];
  },

  getCookies(request) {
    return (request && request.headers.cookie) || '';
  },

  getUserAgent(request) {
    return (request && request.headers['user-agent']) || '';
  },

  getLang(request) {
    const headerAcceptLanguage = this.getAcceptLanguage(request);

    return headerAcceptLanguage ? headerAcceptLanguage.split(';')[0].split(',')[1] : '';
  },
};
