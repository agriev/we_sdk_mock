/* eslint-disable camelcase */

import isString from 'lodash/isString';

import env from 'config/env';
import paths from 'config/paths';

import { discordUrl, twitterEngUrl, twitterRuUrl, facebookRuUrl } from 'app/pages/app/app.consts';

const stageHosts = ['0.0.0.0:4000', 'localhost:4000', 'dev.rawg.io', 'feature.rawg.io'];
const developmentHosts = ['0.0.0.0:4000', 'localhost:4000'];

const appHelper = {
  isMobileOS({ os }) {
    return this.isWinPhone({ os }) || this.isIOS({ os }) || this.isAndroid({ os });
  },

  getNativeOSName(os) {
    const oss = {
      ios: 'iOS',
      android: 'AndroidOS',
      wp: 'WindowsPhoneOS',
    };

    return oss[os];
  },

  isIOS({ os }) {
    return os === 'iOS';
  },

  isAndroid({ os }) {
    return os === 'AndroidOS';
  },

  isWinPhone({ os }) {
    return os === 'WindowsPhoneOS';
  },

  isDesktopSize(data) {
    const size = isString(data) ? data : data.size;
    return size === 'desktop';
  },

  isPhoneSize(data) {
    const size = isString(data) ? data : data.size;
    return size === 'phone';
  },

  isDevWebsite(host) {
    const fromWindow = typeof window !== 'undefined' ? window.location.host : undefined;

    return env.isDev() || developmentHosts.includes(host || fromWindow);
  },

  isStageWebsite(host) {
    const fromWindow = typeof window !== 'undefined' ? window.location.host : undefined;

    return env.isDev() || stageHosts.includes(host || fromWindow);
  },

  getName({ full_name = '', username = '' }, maxLength = 38) {
    const name = full_name || username;
    return name.length > maxLength ? `${name.substr(0, maxLength)}...` : name;
  },

  SOCIAL: {
    ru: {
      discord: discordUrl,
      twitter: twitterRuUrl,
      facebook: facebookRuUrl,
    },
    en: {
      discord: discordUrl,
      twitter: twitterEngUrl,
      facebook: 'https://www.facebook.com/rawgtheworld',
    },
  },

  SOCIAL_MENU: {
    ru: {
      // discord: discordUrl,
      ag_vk: 'https://vk.com/absolute_games',
      ag_twitter: twitterRuUrl,
      ag_facebook: facebookRuUrl,
      ag_museum: 'https://old.ag.ru/',
      ag_yandex_zen: 'https://zen.yandex.ru/id/5d65196586c4a900ae02e500',
    },
    en: {
      leaderboard: paths.leaderboard,
      discord: discordUrl,
      twitter_world: twitterEngUrl,
      twitter_pictures: 'https://twitter.com/rawgthepictures',
    },
  },
};

export default appHelper;
