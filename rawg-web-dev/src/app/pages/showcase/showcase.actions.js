/* eslint-disable no-console */

import urlParse from 'url-parse';

import fetch from 'tools/fetch';
import paginatedAction from 'redux-logic/action-creators/paginated-action';
import Schemas from 'redux-logic/schemas';

export const SHOWCASE_TRENDS_LOAD_SUCCESS = 'SHOWCASE_TRENDS_LOAD_SUCCESS';
export const SHOWCASE_IMGUR_LOAD_SUCCESS = 'SHOWCASE_IMGUR_LOAD_SUCCESS';
export const SHOWCASE_PERSONS_LOAD_SUCCESS = 'SHOWCASE_PERSONS_LOAD_SUCCESS';
export const SHOWCASE_TWITCH_LOAD_SUCCESS = 'SHOWCASE_TWITCH_LOAD_SUCCESS';
export const SHOWCASE_POPULAR_LOAD = 'SHOWCASE_POPULAR_LOAD';
export const SHOWCASE_POPULAR_LOAD_SUCCESS = 'SHOWCASE_POPULAR_LOAD_SUCCESS';
export const SHOWCASE_POPULAR_LOAD_FAIL = 'SHOWCASE_POPULAR_LOAD_FAIL';
export const SHOWCASE_MOST_WATCHED_VIDEOS_LOAD_SUCCESS = 'SHOWCASE_MOST_WATCHED_VIDEOS_LOAD_SUCCESS';
export const SHOWCASE_TOP_REDDIT_POSTS_LOAD_SUCCESS = 'SHOWCASE_TOP_REDDIT_POSTS_LOAD_SUCCESS';
export const SHOWCASE_ALL_COLLECTIONS_LOAD = 'SHOWCASE_ALL_COLLECTIONS_LOAD';
export const SHOWCASE_ALL_COLLECTIONS_LOAD_SUCCESS = 'SHOWCASE_ALL_COLLECTIONS_LOAD_SUCCESS';
export const SHOWCASE_NEWS_LOAD_SUCCESS = 'SHOWCASE_NEWS_LOAD_SUCCESS';

export const SHOWCASE_RECENT_PAST_START = 'SHOWCASE_RECENT_PAST_START';
export const SHOWCASE_RECENT_PAST_SUCCESS = 'SHOWCASE_RECENT_PAST_SUCCESS';
export const SHOWCASE_RECENT_PAST_FAIL = 'SHOWCASE_RECENT_PAST_FAIL';

export const SHOWCASE_RECENT_CURRENT_START = 'SHOWCASE_RECENT_CURRENT_START';
export const SHOWCASE_RECENT_CURRENT_SUCCESS = 'SHOWCASE_RECENT_CURRENT_SUCCESS';
export const SHOWCASE_RECENT_CURRENT_FAIL = 'SHOWCASE_RECENT_CURRENT_FAIL';

export const SHOWCASE_RECENT_FUTURE_START = 'SHOWCASE_RECENT_FUTURE_START';
export const SHOWCASE_RECENT_FUTURE_SUCCESS = 'SHOWCASE_RECENT_FUTURE_SUCCESS';
export const SHOWCASE_RECENT_FUTURE_FAIL = 'SHOWCASE_RECENT_FUTURE_FAIL';

export function loadImgur() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games/lists/imgur?page_size=12';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_IMGUR_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export function loadPersons() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/creators?on_main=true&page_size=9';

    if (state.showcase.persons.results.length > 0) {
      // Не загружаем повторно, если это уже есть в озу браузера
      return undefined;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_PERSONS_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export function loadTwitch() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games/lists/twitch?page_size=12';

    if (state.showcase.twitch.results.length > 0) {
      // Не загружаем повторно, если это уже есть в озу браузера
      return undefined;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_TWITCH_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export const loadPopular = paginatedAction({
  pageSize: 30,
  reload: false,
  endpoint: '/api/games/lists/popular',
  dataPath: 'showcase.popular',
  types: [SHOWCASE_POPULAR_LOAD, SHOWCASE_POPULAR_LOAD_SUCCESS, SHOWCASE_POPULAR_LOAD_FAIL],
  schema: Schemas.GAME_ARRAY,
});

export function loadMostWatchedVideos() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games/lists/youtube?page_size=7';

    if (state.showcase.mostWatchedVideos.results.length > 0) {
      // Не загружаем повторно, если это уже есть в озу браузера
      return undefined;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_MOST_WATCHED_VIDEOS_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export function loadTopRedditPosts() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games/lists/reddit?page_size=6';

    if (state.showcase.topRedditPosts.results.length > 0) {
      // Не загружаем повторно, если это уже есть в озу браузера
      return undefined;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_TOP_REDDIT_POSTS_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export function loadCollections(next = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: SHOWCASE_ALL_COLLECTIONS_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/collections/lists/main?page_size=4';

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: SHOWCASE_ALL_COLLECTIONS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function loadNews() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/banners/medium';

    if (state.showcase.news.title) {
      // Не загружаем повторно, если это уже есть в озу браузера
      return undefined;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SHOWCASE_NEWS_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export const loadRecentCurrent = paginatedAction({
  pageSize: 20,
  reload: false,
  endpoint: '/api/games/lists/recent-games',
  dataPath: 'showcase.recent.current',
  types: [SHOWCASE_RECENT_CURRENT_START, SHOWCASE_RECENT_CURRENT_SUCCESS, SHOWCASE_RECENT_CURRENT_FAIL],
  schema: Schemas.GAME_ARRAY,
});

export const loadRecentFuture = paginatedAction({
  pageSize: 20,
  reload: false,
  endpoint: '/api/games/lists/recent-games-future',
  dataPath: 'showcase.recent.future',
  types: [SHOWCASE_RECENT_FUTURE_START, SHOWCASE_RECENT_FUTURE_SUCCESS, SHOWCASE_RECENT_FUTURE_FAIL],
  schema: Schemas.GAME_ARRAY,
});

export const loadRecentPast = paginatedAction({
  pageSize: 20,
  reload: false,
  endpoint: '/api/games/lists/recent-games-past',
  dataPath: 'showcase.recent.past',
  types: [SHOWCASE_RECENT_PAST_START, SHOWCASE_RECENT_PAST_SUCCESS, SHOWCASE_RECENT_PAST_FAIL],
  schema: Schemas.GAME_ARRAY,
});
