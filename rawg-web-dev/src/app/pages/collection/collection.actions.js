/* eslint-disable no-console */

import urlParse from 'url-parse';
import { push } from 'react-router-redux';
import { normalize } from 'normalizr';
import Schemas from 'redux-logic/schemas';

import assoc from 'ramda/src/assoc';

import fetch from 'tools/fetch';
import len from 'tools/array/len';
import getLoadingConsts from 'tools/redux/get-loading-consts';

import { sendAnalyticsCollectionSave } from 'scripts/analytics-helper';

import paths from 'config/paths';
import { addGameToCollection } from 'app/pages/game/game.actions';

export const COLLECTION_LOAD = 'COLLECTION_LOAD';
export const COLLECTION_LOAD_SUCCESS = 'COLLECTION_LOAD_SUCCESS';
export const COLLECTION_FEED_LOAD = 'COLLECTION_FEED_LOAD';
export const COLLECTION_FEED_LOAD_SUCCESS = 'COLLECTION_FEED_LOAD_SUCCESS';
export const COLLECTION_SAVE = 'COLLECTION_SAVE';
export const COLLECTION_SAVE_SUCCESS = 'COLLECTION_SAVE_SUCCESS';
export const COLLECTION_SAVE_FAIL = 'COLLECTION_SAVE_FAIL';
export const COLLECTION_REMOVE_FEED_ITEM = 'COLLECTION_REMOVE_FEED_ITEM';
export const COLLECTION_SEARCH_GAMES = 'COLLECTION_SEARCH_GAMES';
export const COLLECTION_SEARCH_GAMES_SUCCESS = 'COLLECTION_SEARCH_GAMES_SUCCESS';
export const COLLECTION_CLEAN = 'COLLECTION_CLEAN';
export const COLLECTION_FOLLOW_UNFOLLOW = 'COLLECTION_FOLLOW_UNFOLLOW';
export const COLLECTION_FOLLOW_SUCCESS = 'COLLECTION_FOLLOW_SUCCESS';
export const COLLECTION_UNFOLLOW_SUCCESS = 'COLLECTION_UNFOLLOW_SUCCESS';
export const COLLECTION_RECOMMENDATIONS_LOAD_SUCCESS = 'COLLECTION_RECOMMENDATIONS_LOAD_SUCCESS';

export const COLLECTION_LIKE = getLoadingConsts('COLLECTION_LIKE');

export function loadCollection(slug) {
  return async (dispatch, getState) => {
    const state = getState();
    const method = 'get';
    const collectionUri = `/api/collections/${slug}`;
    const currentState = state.collection;

    if (currentState.slug === slug) {
      return true;
    }

    dispatch({
      type: COLLECTION_LOAD,
    });

    try {
      const collection = await fetch(collectionUri, { method, state });

      dispatch({
        type: COLLECTION_LOAD_SUCCESS,
        data: {
          ...collection,
        },
      });

      return true;
    } catch (error) {
      if (error.status === 401) {
        return false;
      }

      throw error;
    }
  };
}

export function createCollection({ title, description, isPrivate, gameIdToAdd }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/collections';
    const method = 'post';
    const data = {
      name: title,
      description,
      is_private: isPrivate,
    };

    try {
      const { id, slug } = await fetch(uri, { method, data, state });

      dispatch(push(paths.collection(slug)));
      dispatch({ type: COLLECTION_SAVE_SUCCESS, data });
      sendAnalyticsCollectionSave();

      if (gameIdToAdd) {
        dispatch(addGameToCollection(id, slug, gameIdToAdd));
      }
    } catch (error) {
      console.error(error);

      dispatch({
        type: COLLECTION_SAVE_FAIL,
        data: error && error.errors,
      });

      throw error;
    }
  };
}

export function editCollection({ id, title, description, isPrivate }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${id}`;
    const method = 'patch';
    const data = {
      name: title,
      description,
      is_private: isPrivate,
    };

    try {
      const { slug } = await fetch(uri, { method, data, state });

      dispatch({ type: COLLECTION_SAVE_SUCCESS, data });
      dispatch(push(paths.collection(slug)));
    } catch (error) {
      console.error(error);

      dispatch({
        type: COLLECTION_SAVE_FAIL,
        data: error && error.errors,
      });

      throw error;
    }
  };
}

export function loadCollectionFeed(slug, next = 1, feedPageSize, filters) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: COLLECTION_FEED_LOAD,
      data: {
        page: next,
        page_size: feedPageSize,
      },
    });

    const uri = `/api/collections/${slug}/feed`;

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
        page_size: feedPageSize,
        ...filters,
      },
      state,
    }).then((response) => {
      const url = response.next && urlParse(response.next, true);
      const data = normalize(response.results, Schemas.COLLECTION_FEED_ARRAY);

      dispatch({
        type: COLLECTION_FEED_LOAD_SUCCESS,
        data: {
          ...response,
          results: data,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function addCollectionGames(id, games) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/collections/${id}/games`;

    return fetch(uri, {
      method: 'post',
      data: {
        games: games.map((item) => item.id),
      },
      state,
    });
  };
}

export function removeCollectionFeedItem(id, item) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/collections/${id}/feed/${item.id}`;

    dispatch({
      type: COLLECTION_REMOVE_FEED_ITEM,
      data: {
        item,
      },
    });

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });
  };
}

export function editCollectionFeedItem(id, item, text) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/collections/${id}/feed/${item.id}`;

    return fetch(uri, {
      method: 'patch',
      data: {
        text,
      },
      state,
    });
  };
}

export function searchCollectionGames(id, search = '') {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/games';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        exclude_collection: id,
      },
      state,
    });
  };
}

export function addCollectionsSuggestions(id, games) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/collections/${id}/offers`;

    return fetch(uri, {
      method: 'post',
      data: {
        games: games.map((game) => game.id),
      },
      state,
    });
  };
}

export function removeCollection(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/collections/${id}`;

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });
  };
}

export function cleanCollection() {
  return async (dispatch /* getState */) => {
    dispatch({
      type: COLLECTION_CLEAN,
    });
  };
}

export function setBackground(id, game) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${id}`;

    return fetch(uri, {
      method: 'patch',
      data: {
        game_background: game.id,
      },
      state,
    }).then(() => {
      dispatch({
        type: COLLECTION_LOAD_SUCCESS,
        data: {
          ...state.collection,
          game_background: {
            url: game.background_image,
            dominant_color: '0f0f0f',
            saturated_color: '0f0f0f',
          },
        },
      });
    });
  };
}

export function followCollection(collectionArgument) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/users/current/following/collections';
    const collection = assoc('instance', 'collection', collectionArgument);

    dispatch({
      type: COLLECTION_FOLLOW_UNFOLLOW,
      data: { collection },
    });

    return fetch(uri, {
      method: 'post',
      data: {
        collection: collection.id,
      },
      state,
    }).then((/* res */) => {
      dispatch({
        type: COLLECTION_FOLLOW_SUCCESS,
        data: { collection },
      });
    });
  };
}

export function unfollowCollection(collectionArgument) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/current/following/collections/${collectionArgument.id}`;
    const collection = assoc('instance', 'collection', collectionArgument);

    dispatch({
      type: COLLECTION_FOLLOW_UNFOLLOW,
      data: { collection },
    });

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    }).then((/* res */) => {
      dispatch({
        type: COLLECTION_UNFOLLOW_SUCCESS,
        data: { collection },
      });
    });
  };
}

export function loadRecommendations() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/collections/lists/main';
    const currentState = state.collection.recommendations;

    if (len(currentState.results) > 0) {
      return;
    }

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: COLLECTION_RECOMMENDATIONS_LOAD_SUCCESS,
        data: res,
      });
    });
  };
}

export function getCollectionFeedItemPage(id, itemId) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${id}/feed/${itemId}/page`;

    return fetch(uri, {
      method: 'get',
      state,
    });
  };
}

export function likeCollection({ id, userLikesCount, allLikesCount, likesUsers }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${id}/likes`;
    const method = 'post';
    const data = { count: userLikesCount };

    dispatch({
      type: COLLECTION_LIKE.started,
      data: {
        likes_count: allLikesCount,
        user_like: userLikesCount,
        likes_users: likesUsers,
      },
    });

    await fetch(uri, { method, data, state });

    dispatch({ type: COLLECTION_LIKE.success });
  };
}
