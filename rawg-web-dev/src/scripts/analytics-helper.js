import cookies from 'browser-cookies';

import upperFirst from 'lodash/upperFirst';

import config from 'config/config';
import env from 'config/env';
import fetch from 'tools/fetch';
import getGAId from 'tools/get-ga-id';
import {
  GAME_STATUS_BEATEN,
  GAME_STATUS_YET,
  GAME_STATUS_TOPLAY,
  GAME_STATUS_PLAYING,
  GAME_STATUS_DROPPED,
  GAME_STATUS_OWNED,
} from 'app/pages/game/game.types';

export const isRegularUser = () => {
  if (env.isServer()) {
    return true;
  }

  return cookies.get('is_staff') !== 'true';
};

export const analyticsEnabled = () => config.analyticsEnabled && isRegularUser();

export const pageView = (page) => {
  const gaEnabled = analyticsEnabled();

  if (config.loggerGroups.ga) {
    // eslint-disable-next-line no-console
    console.log(`GA ${gaEnabled ? '[enabled]' : '[disabled]'}. Track page:`, page);
  }

  if (gaEnabled) {
    if (typeof ga !== 'undefined') {
      ga('set', 'page', page);
      ga('send', 'pageview', page);
    }

    if (typeof window.yaCounter === 'object') {
      window.yaCounter.hit(page);
    }
  }
};

export const throwEvent = (data) => {
  const gaEnabled = analyticsEnabled();

  if (config.loggerGroups.ga) {
    // eslint-disable-next-line no-console
    console.log(`GA ${gaEnabled ? '[enabled]' : '[disabled]'}. Event:`, data);
  }

  const upperFirstIfNeed = (param) => (data.lowercase ? param : upperFirst(param));

  if (gaEnabled && typeof ga !== 'undefined') {
    if (data.label) {
      if (data.value) {
        ga(
          'send',
          'event',
          upperFirstIfNeed(data.category),
          upperFirstIfNeed(data.action),
          upperFirstIfNeed(data.label),
          upperFirstIfNeed(data.value),
        );
      } else {
        ga(
          'send',
          'event',
          upperFirstIfNeed(data.category),
          upperFirstIfNeed(data.action),
          upperFirstIfNeed(data.label),
        );
      }

      return;
    }

    if (data.value) {
      ga(
        'send',
        'event',
        upperFirstIfNeed(data.category),
        upperFirstIfNeed(data.action),
        undefined,
        upperFirstIfNeed(data.value),
      );
    } else {
      ga('send', 'event', upperFirstIfNeed(data.category), upperFirstIfNeed(data.action));
    }
  }
};

export function sendAnalyticsRegister() {
  if (analyticsEnabled()) {
    throwEvent({
      category: 'user_auth',
      action: 'signup',
    });
  }
}

export function sendAnalyticsCollectionSave() {
  if (analyticsEnabled()) {
    //
  }
}

export function sendAnalyticsGamesImport(store) {
  throwEvent({
    category: 'user_import',
    action: 'started',
    label: store,
    lowercase: true,
  });
}

export function sendAnalyticsEdit(actionName) {
  throwEvent({
    category: 'game_edit',
    action: actionName,
  });
}

export async function sendAnalyticsRate(action) {
  throwEvent({ category: 'review_carousel', action });
}

export async function sendOurAnalyticsRate({ state, action, slug, rating }) {
  if (!action) {
    throw new Error('action must be present to sendOurAnalyticsRate');
  }

  await fetch('/api/stat/carousel-rating', {
    method: 'post',
    parse: false,
    state,
    data: {
      ga: getGAId(),
      action,
      slug,
      rating,
    },
  });
}

export function sendAnalyticsGameStatus(status) {
  const actionName = () => {
    switch (status) {
      case GAME_STATUS_OWNED:
        return 'uncategorized';
      case GAME_STATUS_DROPPED:
        return 'abandoned';
      case GAME_STATUS_PLAYING:
        return 'currently playing';
      case GAME_STATUS_TOPLAY:
        return 'wishlist';
      case GAME_STATUS_BEATEN:
        return 'completed';
      case GAME_STATUS_YET:
        return 'yet to play';
      default:
        return status;
    }
  };

  throwEvent({
    category: 'game_state_change',
    action: actionName(),
  });
}
