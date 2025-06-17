import cookies from 'browser-cookies';

import checkLogin from 'tools/check-login';

import fetch from 'tools/fetch';

import propEq from 'ramda/src/propEq';
import propSatisfies from 'ramda/src/propSatisfies';
import cond from 'ramda/src/cond';
import assoc from 'ramda/src/assoc';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';
import T from 'ramda/src/T';

import env from 'config/env';

import paginatedAction from 'redux-logic/action-creators/paginated-action';
import Schemas from 'redux-logic/schemas';

import getLoadingConsts from 'tools/redux/get-loading-consts';

import {
  mainUrl,
  recentUrl,
  lastYearUrl,
  bestYearGamesUrl,
  bestGamesUrl,
  wishlistUrl,
  libraryUrl,
  friendsUrl,
  suggestedUrl,
  searchUrl,
} from './discover.url-helpers';

import {
  DISCOVER_SEC_MAIN,
  DISCOVER_SEC_RECENT_CURRENT,
  DISCOVER_SEC_RECENT_FUTURE,
  DISCOVER_SEC_RECENT_PAST,
  DISCOVER_SEC_BEST,
  DISCOVER_SEC_TOP_RATED,
  DISCOVER_SEC_ALL_TIME,
  DISCOVER_SEC_WISHLIST,
  DISCOVER_SEC_FRIENDS,
  isLibrarySection,
} from './discover.sections';

export const DISCOVER_LOAD_GAMES_START = 'DISCOVER_LOAD_GAMES_START';
export const DISCOVER_LOAD_GAMES_SUCCESS = 'DISCOVER_LOAD_GAMES_SUCCESS';
export const DISCOVER_LOAD_GAMES_FAILED = 'DISCOVER_LOAD_GAMES_FAILED';

export const DISCOVER_LOAD_SLIDER = 'DISCOVER_LOAD_SLIDER';

export const DISCOVER_LOAD_YEARS_WISHLIST = 'DISCOVER_LOAD_YEARS_WISHLIST';
export const DISCOVER_LOAD_YEARS_LIBRARY = 'DISCOVER_LOAD_YEARS_LIBRARY';
export const DISCOVER_LOAD_YEARS_FRIENDS = 'DISCOVER_LOAD_YEARS_FRIENDS';

export const DISCOVER_LOAD_FOLLOWINGS_START = 'DISCOVER_LOAD_FOLLOWINGS_START';
export const DISCOVER_LOAD_FOLLOWINGS_SUCCESS = 'DISCOVER_LOAD_FOLLOWINGS_SUCCESS';
export const DISCOVER_LOAD_FOLLOWINGS_FAILED = 'DISCOVER_LOAD_FOLLOWINGS_FAILED';

export const DISCOVER_LOAD_RECOMMENDED = 'DISCOVER_LOAD_RECOMMENDED';
export const DISCOVER_LOAD_LAST_PLAYED = 'DISCOVER_LOAD_LAST_PLAYED';

export const DISCOVER_FOLLOW_START = 'DISCOVER_FOLLOW_START';
export const DISCOVER_FOLLOW_SUCCESS = 'DISCOVER_FOLLOW_SUCCESS';
export const DISCOVER_FOLLOW_FAILED = 'DISCOVER_FOLLOW_FAILED';

export const DISCOVER_UNFOLLOW_START = 'DISCOVER_UNFOLLOW_START';
export const DISCOVER_UNFOLLOW_SUCCESS = 'DISCOVER_UNFOLLOW_SUCCESS';
export const DISCOVER_UNFOLLOW_FAILED = 'DISCOVER_UNFOLLOW_FAILED';

export const DISCOVER_HIDE_GAME = getLoadingConsts('DISCOVER_HIDE_GAME');

export const DISCOVER_SEARCH_START = 'DISCOVER_SEARCH_START';
export const DISCOVER_SEARCH_SUCCESS = 'DISCOVER_SEARCH_SUCCESS';
export const DISCOVER_SEARCH_FAILED = 'DISCOVER_SEARCH_FAILED';
export const DISCOVER_SEARCH_RESET = 'DISCOVER_SEARCH_RESET';

export const DISCOVER_SET_DISPLAY_MODE = 'DISCOVER_SET_DISPLAY_MODE';

export const DISCOVER_LOAD_SUGGESTED_GAMES = 'DISCOVER_LOAD_SUGGESTED_GAMES';
export const DISCOVER_LOAD_SUGGESTED_GAMES_SUCCESS = 'DISCOVER_LOAD_SUGGESTED_GAMES_SUCCESS';
export const DISCOVER_LOAD_SUGGESTED_GAMES_FAIL = 'DISCOVER_LOAD_SUGGESTED_GAMES_FAIL';

export const getEndpoint = cond([
  [propEq('id', DISCOVER_SEC_MAIN), mainUrl],

  [propEq('id', DISCOVER_SEC_RECENT_PAST), recentUrl('past')],
  [propEq('id', DISCOVER_SEC_RECENT_CURRENT), recentUrl()],
  [propEq('id', DISCOVER_SEC_RECENT_FUTURE), recentUrl('future')],

  [propEq('id', DISCOVER_SEC_BEST), bestYearGamesUrl],
  [propEq('id', DISCOVER_SEC_TOP_RATED), lastYearUrl],
  [propEq('id', DISCOVER_SEC_ALL_TIME), bestGamesUrl],

  [propEq('id', DISCOVER_SEC_WISHLIST), wishlistUrl],
  [propSatisfies(isLibrarySection, 'id'), libraryUrl],
  [propEq('id', DISCOVER_SEC_FRIENDS), friendsUrl],
]);

export const getDiscoverPageSize = ({ currentUser }) => {
  // Во имя seo мы отдаём гостям более жирные пачки данных на одной странице
  return currentUser.id ? 20 : 40;
};

export const loadDiscoverGames = paginatedAction({
  pageSize: getDiscoverPageSize,
  endpoint: getEndpoint,
  dataPath: 'discover.games',
  types: [DISCOVER_LOAD_GAMES_START, DISCOVER_LOAD_GAMES_SUCCESS, DISCOVER_LOAD_GAMES_FAILED],
  schema: Schemas.GAME_ARRAY,
});

const followingApiEndpoint = '/api/users/current/following/instances';

export const loadDiscoverFollowings = paginatedAction({
  pageSize: getDiscoverPageSize,
  endpoint: followingApiEndpoint,
  onlyAuthored: true,
  dataPath: 'discover.followings',
  schema: Schemas.DISCOVER_FOLLOWINGS_ARRAY,
  reload: false,
  types: [DISCOVER_LOAD_FOLLOWINGS_START, DISCOVER_LOAD_FOLLOWINGS_SUCCESS, DISCOVER_LOAD_FOLLOWINGS_FAILED],
});

export function loadDiscoverRecommended() {
  return async (dispatch, getState) => {
    const state = getState();

    try {
      const results = await fetch('/api/games/recommended', {
        state,
      });

      dispatch({ type: DISCOVER_LOAD_RECOMMENDED, data: results || [] });
    } catch {
      //
    }
  };
}

export function loadDiscoverLastPlayed() {
  return async (dispatch, getState) => {
    const state = getState();

    try {
      const results = await fetch('/api/games/last_played', {
        state,
      });

      dispatch({ type: DISCOVER_LOAD_LAST_PLAYED, data: results || [] });
    } catch {
      //
    }
  };
}

export function loadSectionsYears(section) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.app.token) {
      return;
    }

    const res = await cond([
      [equals(DISCOVER_SEC_WISHLIST), () => fetch('/api/users/current/games/years?toplay=true', { state })],
      [isLibrarySection, () => fetch('/api/users/current/games/years', { state })],
      [equals(DISCOVER_SEC_FRIENDS), () => fetch('/api/users/current/following/users/games/years', { state })],
      [T, always(undefined)],
    ])(section);

    if (res) {
      const type = cond([
        [equals(DISCOVER_SEC_WISHLIST), always(DISCOVER_LOAD_YEARS_WISHLIST)],
        [isLibrarySection, always(DISCOVER_LOAD_YEARS_LIBRARY)],
        [equals(DISCOVER_SEC_FRIENDS), always(DISCOVER_LOAD_YEARS_FRIENDS)],
      ])(section);

      dispatch({
        type,
        data: res.results,
      });
    }
  };
}

export function loadSlider() {
  return async (dispatch, getState) => {
    const state = getState();

    try {
      const results = await fetch('/api/games/featured', {
        state,
      });

      dispatch({ type: DISCOVER_LOAD_SLIDER, data: results || [] });
    } catch {
      //
    }
  };
}

export function follow(item) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({ type: DISCOVER_FOLLOW_START, data: { item } });

    try {
      await fetch(followingApiEndpoint, {
        method: 'post',
        data: {
          instance: item.instance,
          object_id: item.id,
        },
        state,
      });

      dispatch({ type: DISCOVER_FOLLOW_SUCCESS, data: { item } });
    } catch (error) {
      dispatch({ type: DISCOVER_FOLLOW_FAILED, data: { item } });
    }
  };
}

export function unfollow(item) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({ type: DISCOVER_UNFOLLOW_START, data: { item } });

    try {
      await fetch(`${followingApiEndpoint}/${item.instance}:${item.id}`, {
        method: 'delete',
        state,
      });

      dispatch({ type: DISCOVER_UNFOLLOW_SUCCESS, data: { item } });
    } catch (error) {
      dispatch({ type: DISCOVER_UNFOLLOW_FAILED, data: { item } });
    }
  };
}

export const toggleFollow = (dispatch, itemArgument, inst) => {
  const item = inst ? assoc('instance', inst, itemArgument) : itemArgument;

  checkLogin(dispatch, () => {
    if (item.following) {
      dispatch(unfollow(item));
    } else {
      dispatch(follow(item));
    }
  });
};

export const hideRecommendedGame = (game) => {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({ type: DISCOVER_HIDE_GAME.started, data: game });

    try {
      await fetch('/api/recommendations/games/dislike', {
        method: 'post',
        data: {
          game: game.id,
        },
        state,
      });

      dispatch({ type: DISCOVER_HIDE_GAME.success, data: game });
    } catch (error) {
      dispatch({ type: DISCOVER_HIDE_GAME.failed, data: game });
    }
  };
};

const modeCookieKey = 'discover-display-mode';

function getCurrentMode(requestCookies) {
  if (typeof window !== 'undefined') {
    return cookies.get(modeCookieKey);
  }

  return (requestCookies || {})[modeCookieKey];
}

export function setDiscoverDisplayMode(modeArgument) {
  return async (dispatch, getState) => {
    const state = getState();
    const mode = modeArgument || getCurrentMode(state.app.request.cookies);

    if (modeArgument && env.isClient()) {
      cookies.set(modeCookieKey, mode, { expires: 365 });
    }

    if (mode) {
      dispatch({
        type: DISCOVER_SET_DISPLAY_MODE,
        data: {
          mode,
        },
      });
    }
  };
}

export const loadSuggestedGames = paginatedAction({
  pageSize: getDiscoverPageSize,
  endpoint: suggestedUrl,
  dataPath: 'discover.games',
  types: [DISCOVER_LOAD_SUGGESTED_GAMES, DISCOVER_LOAD_SUGGESTED_GAMES_SUCCESS, DISCOVER_LOAD_SUGGESTED_GAMES_FAIL],
  schema: Schemas.GAME_ARRAY,
});

export const loadDiscoverSearch = paginatedAction({
  pageSize: getDiscoverPageSize,
  endpoint: searchUrl,
  dataPath: 'discover.search',
  types: [DISCOVER_SEARCH_START, DISCOVER_SEARCH_SUCCESS, DISCOVER_SEARCH_FAILED],
  schema: Schemas.DISCOVER_SEARCH_ARRAY,
});

export const resetDiscoverSearch = () => ({
  type: DISCOVER_SEARCH_RESET,
});
