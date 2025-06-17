import cookies from 'browser-cookies';
import { push, goBack } from 'react-router-redux';
import NProgress from 'nprogress';

import sumBy from 'lodash/sumBy';
import fetch from 'tools/fetch';

import { loadCurrentUser, steamAuth } from 'app/components/current-user/current-user.actions';
// import { sendAnalyticsRegister } from 'scripts/analytics-helper';

import env from 'config/env';
import paths from 'config/paths';
import fetchWithCache from 'tools/fetch-with-cache';
import Error404 from 'interfaces/error-404';

import { setIsNewUser } from 'app/pages/login/login.helper';
import { sendRatedGames } from 'app/pages/rate-games/rate-games.actions';
import user from 'app/components/current-user/current-user.helper';
import { AUTH_FORWARD_DEVELOPER } from 'tools/hocs/check-auth';

export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export const FIRST_RENDER_END = 'FIRST_RENDER_END';
export const SECOND_PAGE_SHOWN = 'SECOND_PAGE_SHOWN';
export const AUTH_SUCCESS = 'AUTH_SUCCESS';
export const AUTH_FROM_RATE_CARDS_START = 'AUTH_FROM_RATE_CARDS_START';
export const AUTH_FROM_RATE_CARDS_END = 'AUTH_FROM_RATE_CARDS_END';
export const REGISTER_SUCCESS = 'REGISTER_SUCCESS';
export const REGISTER_FROM_TOKENS_PAGE = 'REGISTER_FROM_TOKENS_PAGE';
export const AUTH_PROVIDER_MESSAGE = 'UTH_PROVIDER_MESSAGE';
export const AUTH_PROVIDER_MESSAGE_ERROR = 'AUTH_PROVIDER_MESSAGE_ERROR';
export const DISPLAY_RESIZE = 'DISPLAY_RESIZE';
export const SAVE_PAGE = 'SAVE_PAGE';
export const STATUS = 'STATUS';
export const RESPONSE_HEADER = 'RESPONSE_HEADER';
export const LOADING = 'LOADING';
export const FEED_COUNTERS = 'FEED_COUNTERS';
export const RATINGS = 'RATINGS';
export const REACTIONS = 'REACTIONS';
export const PLATFORMS = 'PLATFORMS';
export const GAMES_COUNT = 'GAMES_COUNT';
export const STORES = 'STORES';
export const GENRES = 'GENRES';
export const PUBLISHERS = 'PUBLISHERS';
export const PUBLISHERS_LOADING = 'PUBLISHERS_LOADING';
export const DEVELOPERS = 'DEVELOPERS';
export const DEVELOPERS_LOADING = 'DEVELOPERS_LOADING';
export const ESRB_RATINGS = 'ESRB_RATINGS';
export const SHOW_COMMENT = 'SHOW_COMMENT';
export const COMMENT_SHOWN = 'COMMENT_SHOWN';
export const SET_PRIVATE_PAGE = 'SET_PRIVATE_PAGE';
export const SET_PREVIOUS_PAGE = 'SET_PREVIOUS_PAGE';
export const SET_HEDAER_VISIBILITY = 'SET_HEDAER_VISIBILITY';
export const ANALYTICS_INITIALIZED = 'ANALYTICS_INITIALIZED';
export const TOGGLE_PROFILE_IFRAME_VISIBILITY = 'TOGGLE_PROFILE_IFRAME_VISIBILITY';

export function setPrivatePage(value) {
  return {
    type: SET_PRIVATE_PAGE,
    data: value,
  };
}

export function setHeaderVisibility(value) {
  return async (dispatch, getState) => {
    const { headerVisible } = getState().app;

    if (headerVisible !== value) {
      dispatch({
        type: SET_HEDAER_VISIBILITY,
        data: value,
      });
    }
  };
}

export function markFirstRender() {
  return (dispatch) =>
    dispatch({
      type: FIRST_RENDER_END,
    });
}

export function markSecondPage() {
  return (dispatch) =>
    dispatch({
      type: SECOND_PAGE_SHOWN,
    });
}

export function resetDisplaySize(size) {
  return (dispatch) =>
    dispatch({
      type: DISPLAY_RESIZE,
      data: { size },
    });
}

export function registerFromTokensPage() {
  return {
    type: REGISTER_FROM_TOKENS_PAGE,
  };
}

export function saveRedirectPage({ pathname, force, helmet }) {
  return {
    type: SAVE_PAGE,
    data: { pathname, force, helmet },
  };
}

// Так как мы решили кешировать на уровне nginx весь
// контент для гостей, чтобы польователь после авторизации
// мог получить самую последнюю версию веб-приложения (не закешированную),
// после авторизации необходимо перезагрузить всю страницу.
// Подробнее: https://3.basecamp.com/3964781/buckets/10157323/messages/1496694122
const fullReloadOnAuth = true;

const changePage = (dispatch, path) => {
  if (fullReloadOnAuth) {
    window.location.href = path;
    return undefined;
  }

  return dispatch(push(path));
};

export function loadToken() {
  return async (dispatch) => {
    let token = '';

    if (env.isClient()) {
      token = cookies.get('token');
    }

    await dispatch({
      type: AUTH_SUCCESS,
      data: { token },
    });
  };
}

export function authSuccess({ res, context, redirect = true, forward }) {
  return async (dispatch, getState) => {
    let state = getState();
    const { app } = state;
    const { socialAuthFromRateCards } = app;
    const token = res.key;
    // const steamId = res.steam_id;

    if (context === 'register' || res.new) {
      setIsNewUser();
    }

    await dispatch({
      type: AUTH_SUCCESS,
      data: { token },
    });

    await Promise.all([dispatch(loadCurrentUser())]);

    if (env.isClient()) {
      cookies.set('token_client', token, { expires: 365 });
    }

    state = getState();
    const { currentUser } = state;

    if (!redirect || socialAuthFromRateCards) {
      return undefined;
    }

    if (app.savedPage && app.savedPageForce) {
      changePage(dispatch, app.savedPage);
    } else if (forward === AUTH_FORWARD_DEVELOPER) {
      changePage(dispatch, user.getDeveloperURL(currentUser));
    } else if (context === 'register' || res.new) {
      /* eslint-disable-next-line arrow-body-style */
      const handleSignupWithSavedPage = () => {
        /* logic to show user paths.gameAccounts page later could be here */
        return changePage(dispatch, app.savedPage);
      };

      return app.savedPage ? handleSignupWithSavedPage() : changePage(dispatch, paths.gameAccounts);
    } else if (currentUser.rememberedGameAccounts) {
      changePage(dispatch, paths.settingsGameAccounts);
    } else if (app.savedPage) {
      changePage(dispatch, app.savedPage);
    } else if (window.history.length > 1) {
      if (fullReloadOnAuth) {
        window.history.back();
        setTimeout(() => {
          // eslint-disable-next-line no-self-assign
          window.location.href = window.location.href;
        }, 400);
      } else {
        dispatch(goBack());
      }
    } else {
      changePage(dispatch, paths.index);
    }

    return undefined;
  };
}

export function setSocialAuthFromRateCardsBegin() {
  return async (dispatch) => {
    dispatch({ type: AUTH_FROM_RATE_CARDS_START });
  };
}

export function setSocialAuthFromRateCardsEnd() {
  return async (dispatch) => {
    dispatch({ type: AUTH_FROM_RATE_CARDS_END });
  };
}

export function setStatus(status) {
  return {
    type: STATUS,
    data: { status },
  };
}

export function setResponseHeader(name, value) {
  return {
    type: RESPONSE_HEADER,
    data: { name, value },
  };
}

/**
 * Ф-я проверит результаты всех завершившихся экшенов, подсчитает
 * сумму результатов от полученных данных, и если все они будут равны
 * нулю - то назначит в качестве ответа страницы 404-й код.
 *
 * Обратите внимание, что ф-я должна принять МАССИВ результатов экшенов, т.е.
 * она должна использоваться только в связке с
 * Promise.all([ваши экшены, даже если он один]).then(return404IfEmptyPage).
 *
 * Иначе подсчёт значений окажется некорректным.
 */
export const return404IfEmptyPage = (dispatch, { isThrowingError } = {}) => (actionResults) => {
  if (env.isClient()) {
    return;
  }

  if (sumBy(actionResults, 'data.count') === 0) {
    dispatch(setStatus(404));

    if (isThrowingError) {
      throw new Error404();
    }
  }
};

export function setLoading(loading) {
  if (loading) {
    if (NProgress.status) {
      NProgress.inc();
    } else {
      NProgress.start();
    }
  } else {
    NProgress.done();
  }

  return (dispatch) =>
    dispatch({
      type: LOADING,
      data: { loading },
    });
}

export function getFeedCounter() {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/feed/counters';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: FEED_COUNTERS,
        data: res,
      });
    });
  };
}

const fetchRatingsCached = fetchWithCache();

export function getRatings() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/reviews/ratings';

    return fetchRatingsCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: RATINGS,
        data: res.results,
      });
    });
  };
}

const fetchReactionsCached = fetchWithCache();

export function getReactions() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/reviews/reactions';

    return fetchReactionsCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: REACTIONS,
        data: res.results,
      });
    });
  };
}

const fetchPlatformsCached = fetchWithCache(60);

export function getPlatforms() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/platforms';

    return fetchPlatformsCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: PLATFORMS,
        data: res.results,
      });
    });
  };
}

const fetchGamesCountCached = fetchWithCache(600);

export function getGamesCount() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games?page_size=1';

    return fetchGamesCountCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: GAMES_COUNT,
        data: res.count,
      });
    });
  };
}

const fetchStoresCached = fetchWithCache(60);

export function getStores() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/stores';

    return fetchStoresCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: STORES,
        data: res.results,
      });
    });
  };
}

const fetchGenresCached = fetchWithCache(60);

export function getGenres() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/genres';

    return fetchGenresCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: GENRES,
        data: res.results,
      });
    });
  };
}

export function getPublishers(search) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/publishers';

    dispatch({
      type: PUBLISHERS_LOADING,
    });

    return fetch(uri, {
      method: 'get',
      state,
      data: {
        search,
      },
    }).then((res) => {
      dispatch({
        type: PUBLISHERS,
        data: res.results,
      });
    });
  };
}

export function getDevelopers(search) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/developers';

    dispatch({
      type: DEVELOPERS_LOADING,
    });

    return fetch(uri, {
      method: 'get',
      state,
      data: {
        search,
      },
    }).then((res) => {
      dispatch({
        type: DEVELOPERS,
        data: res.results,
      });
    });
  };
}

export function getESRBRatings() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/ratings/esrb';
    const method = 'get';

    return fetch(uri, {
      method,
      state,
    }).then((res) => {
      dispatch({
        type: ESRB_RATINGS,
        data: res.results,
      });
    });
  };
}

export function showComment(id) {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: SHOW_COMMENT,
      data: {
        id,
      },
    });
  };
}

export function commentShown() {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: COMMENT_SHOWN,
    });
  };
}

export function checkSocialRights() {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/auth/social/write';

    return fetch(uri, {
      method: 'get',
      state,
    });
  };
}

export function enableAnalytics() {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.app.analyticsInitialized) {
      // There is was code for post-client init of
      // analytics scripts. Now there is nothing to do,
      // but you can add something.

      dispatch({ type: ANALYTICS_INITIALIZED });
    }
  };
}

export function setPreviousPage(path) {
  return {
    type: SET_PREVIOUS_PAGE,
    data: {
      previousPage: path,
    },
  };
}

export function toggleProfileIframeVisibility({ state, callback }) {
  return {
    type: TOGGLE_PROFILE_IFRAME_VISIBILITY,
    data: {
      profileIframeCallback: callback,
      profileIframeVisibility: state,
    },
  };
}
