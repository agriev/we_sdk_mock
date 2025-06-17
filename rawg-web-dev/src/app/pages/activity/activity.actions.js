import urlParse from 'url-parse';
import { normalize } from 'normalizr';

import Schemas from 'redux-logic/schemas';
import fetch from 'tools/fetch';

import { FEED_COUNTERS } from 'app/pages/app/app.actions';

export const ACTIVITY_NOTIFICATIONS_LOAD = 'ACTIVITY_NOTIFICATIONS_LOAD';
export const ACTIVITY_NOTIFICATIONS_LOAD_SUCCESS = 'ACTIVITY_NOTIFICATIONS_LOAD_SUCCESS';
export const ACTIVITY_FOLLOW_UNFOLLOW_USER = 'ACTIVITY_FOLLOW_UNFOLLOW_USER';
export const ACTIVITY_FOLLOW_USER_SUCCESS = 'ACTIVITY_FOLLOW_USER_SUCCESS';
export const ACTIVITY_UNFOLLOW_USER_SUCCESS = 'ACTIVITY_UNFOLLOW_USER_SUCCESS';
export const ACTIVITY_SIMILAR_LOAD = 'ACTIVITY_SIMILAR_LOAD';
export const ACTIVITY_SIMILAR_LOAD_SUCCESS = 'ACTIVITY_SIMILAR_LOAD_SUCCESS';
export const ACTIVITY_TOGGLE_REVIEWS_AND_POSTS = 'ACTIVITY_TOGGLE_REVIEWS_AND_POSTS';

export function loadSimilar(next) {
  return async (dispatch, getState) => {
    const state = getState();

    if (state.activity.similar.results.length > 0) {
      return undefined;
    }

    const uri = '/api/users/current/similar?page_size=8';

    dispatch({
      type: ACTIVITY_SIMILAR_LOAD,
    });

    const data = { page: next };

    return fetch(uri, {
      method: 'get',
      data,
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: ACTIVITY_SIMILAR_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function loadFeedNotifications(next) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/feed/notifications?page_size=40';

    // Если следующей страницы нет - не загружаем ничего
    if (!next) {
      return undefined;
    }

    dispatch({
      type: ACTIVITY_NOTIFICATIONS_LOAD,
    });

    const data = { page: next };

    return fetch(uri, {
      method: 'get',
      data,
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);
      const items = normalize(res.results, Schemas.NOTIFICATION_FEED_ARRAY);

      dispatch({
        type: ACTIVITY_NOTIFICATIONS_LOAD_SUCCESS,
        data: {
          ...res,
          results: items,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function resetCounter(tab) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/feed/counters';

    return fetch(uri, {
      method: 'post',
      data: {
        [tab]: true,
      },
      state,
    }).then((res) => {
      dispatch({
        type: FEED_COUNTERS,
        data: res,
      });
    });
  };
}

export function followUser(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/users/current/following/users';

    dispatch({
      type: ACTIVITY_FOLLOW_UNFOLLOW_USER,
      data: id,
    });

    return fetch(uri, {
      method: 'post',
      data: {
        follow: id,
      },
      state,
    }).then((/* res */) => {
      dispatch({
        type: ACTIVITY_FOLLOW_USER_SUCCESS,
        data: id,
      });
    });
  };
}

export function unfollowUser(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/users/current/following/users/${id}`;

    dispatch({
      type: ACTIVITY_FOLLOW_UNFOLLOW_USER,
      data: id,
    });

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    }).then((/* res */) => {
      dispatch({
        type: ACTIVITY_UNFOLLOW_USER_SUCCESS,
        data: id,
      });
    });
  };
}
