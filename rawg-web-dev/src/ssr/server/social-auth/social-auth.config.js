import config from 'config/config';
import socialAccountsHelper from 'app/components/social-accounts/social-accounts.helper';

const socialAuthConfig = {
  facebook: {
    ru: {
      clientID: '217869182471783',
      clientSecret: 'd641d9726879b25bc626acb8de75eae7',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('facebook', 'ru'),
    },
    en: {
      clientID: '1818382835046544',
      clientSecret: 'd559fa548a8ce09c00e129b50295317d',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('facebook', 'en'),
    },
  },

  twitter: {
    ru: {
      consumerKey: 'A9rBaelaX3dOOMGb4gRZOvoNd',
      consumerSecret: 'ZmaX7gd7kZFRXXgTtpd0qeCy65cfLeW8sIXHFHci8VGXfLroqt',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('twitter', 'ru'),
    },
    en: {
      consumerKey: 'A9rBaelaX3dOOMGb4gRZOvoNd',
      consumerSecret: 'ZmaX7gd7kZFRXXgTtpd0qeCy65cfLeW8sIXHFHci8VGXfLroqt',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('twitter', 'en'),
    },
  },

  steam: {
    ru: {
      apiKey: 'AAA9F05371C614914AD74C26C958436A',
      realm: config.clientAddress.ru,
      returnURL: socialAccountsHelper.getProviderCallbackAddress('steam', 'ru'),
    },
    en: {
      apiKey: 'AAA9F05371C614914AD74C26C958436A',
      realm: config.clientAddress.en,
      returnURL: socialAccountsHelper.getProviderCallbackAddress('steam', 'en'),
    },
  },

  vk: {
    ru: {
      clientID: '8205368',
      clientSecret: 'd4zTvKSlmLPwiIYog8lt',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('vk', 'ru'),
    },
    en: {
      clientID: '8205368',
      clientSecret: 'd4zTvKSlmLPwiIYog8lt',
      callbackURL: socialAccountsHelper.getProviderCallbackAddress('vk', 'en'),
    },
  },
};

export default socialAuthConfig;
