import urlJoin from 'url-join';
import config from 'config/config';

export default {
  getProviderPath(provider, locale) {
    return `/${locale}/${provider}`;
  },

  getProviderCallbackPath(provider, locale) {
    return urlJoin(this.getProviderPath(provider, locale), 'callback');
  },

  getProviderAddress(provider, locale) {
    return urlJoin(config.clientAddress[locale], config.socialAuthPath, this.getProviderPath(provider, locale));
  },

  getProviderCallbackAddress(provider, locale) {
    return urlJoin(config.clientAddress[locale], config.socialAuthPath, this.getProviderCallbackPath(provider, locale));
  },
};
