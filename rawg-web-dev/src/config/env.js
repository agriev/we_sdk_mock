export default {
  get NODE_ENV() {
    return process.env.NODE_ENV;
  },

  isClient() {
    return typeof window !== 'undefined';
  },

  isServer() {
    return !this.isClient();
  },

  isProd() {
    return (this.isClient() ? window.CLIENT_PARAMS.environment : this.NODE_ENV) === 'production';
  },

  isDev() {
    return !this.isProd();
  },
};
