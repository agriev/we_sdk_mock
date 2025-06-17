/* eslint-disable sonarjs/no-duplicate-string */

import urlParse from 'url-parse';
import { normalize } from 'normalizr';

import fetch from 'tools/fetch';
import paths from 'config/paths';
import { CALL_API } from 'redux-logic/middlewares/api';
import Schemas from 'redux-logic/schemas';
import getLoadingConsts from 'tools/redux/get-loading-consts';
import makeRedirect from 'tools/redirect';

import env from 'config/env';
import { setResponseHeader } from 'app/pages/app/app.actions';

export const GAME_RESET_STATE = 'GAME_RESET_STATE';
export const GAME_LOAD = 'GAME_LOAD';
export const GAME_LOAD_SUCCESS = 'GAME_LOAD_SUCCESS';
export const GAME_SCREENSHOT_LOAD = 'GAME_SCREENSHOT_LOAD';
export const GAME_SCREENSHOT_LOAD_SUCCESS = 'GAME_SCREENSHOT_LOAD_SUCCESS';
export const GAME_SCREENSHOT_LOAD_FAILED = 'GAME_SCREENSHOT_LOAD_FAILED';
export const GAME_SCREENSHOTS_LOAD = 'GAME_SCREENSHOTS_LOAD';
export const GAME_SCREENSHOTS_LOAD_SUCCESS = 'GAME_SCREENSHOTS_LOAD_SUCCESS';
export const GAME_MOVIES_LOAD = 'GAME_MOVIES_LOAD';
export const GAME_MOVIES_LOAD_SUCCESS = 'GAME_MOVIES_LOAD_SUCCESS';
export const GAME_SUGGESTIONS_LOAD = 'GAME_SUGGESTIONS_LOAD';
export const GAME_SUGGESTIONS_LOAD_SUCCESS = 'GAME_SUGGESTIONS_LOAD_SUCCESS';
export const GAME_SUGGESTIONS_LOAD_FAIL = 'GAME_SUGGESTIONS_LOAD_FAIL';
export const GAME_COLLECTIONS_LOAD = 'GAME_COLLECTIONS_LOAD';
export const GAME_COLLECTIONS_LOAD_SUCCESS = 'GAME_COLLECTIONS_LOAD_SUCCESS';
export const GAME_REVIEWS_LOAD = 'GAME_REVIEWS_LOAD';
export const GAME_REVIEWS_LOAD_SUCCESS = 'GAME_REVIEWS_LOAD_SUCCESS';
export const GAME_REVIEWS_UPDATE_SUCCESS = 'GAME_REVIEWS_UPDATE_SUCCESS';
export const GAME_POSTS_LOAD = 'GAME_POSTS_LOAD';
export const GAME_POSTS_LOAD_SUCCESS = 'GAME_POSTS_LOAD_SUCCESS';
export const GAME_POSTS_UPDATE_SUCCESS = 'GAME_POSTS_UPDATE_SUCCESS';
export const GAME_OWNERS_LOAD = 'GAME_OWNERS_LOAD';
export const GAME_OWNERS_LOAD_SUCCESS = 'GAME_OWNERS_LOAD_SUCCESS';
export const GAME_YOUTUBE_LOAD = 'GAME_YOUTUBE_LOAD';
export const GAME_YOUTUBE_LOAD_SUCCESS = 'GAME_YOUTUBE_LOAD_SUCCESS';
export const GAME_PERSONS_LOAD = 'GAME_PERSONS_LOAD';
export const GAME_PERSONS_LOAD_SUCCESS = 'GAME_PERSONS_LOAD_SUCCESS';
export const GAME_PERSON_GAMES_LOAD_NEXT = 'GAME_PERSON_GAMES_LOAD_NEXT';
export const GAME_IMGUR_LOAD = 'GAME_IMGUR_LOAD';
export const GAME_IMGUR_LOAD_SUCCESS = 'GAME_IMGUR_LOAD_SUCCESS';
export const GAME_ACHIEVEMENTS_LOAD = 'GAME_ACHIEVEMENTS_LOAD';
export const GAME_ACHIEVEMENTS_LOAD_SUCCESS = 'GAME_ACHIEVEMENTS_LOAD_SUCCESS';
export const GAME_REDDIT_LOAD = 'GAME_REDDIT_LOAD';
export const GAME_REDDIT_LOAD_SUCCESS = 'GAME_REDDIT_LOAD_SUCCESS';
export const GAME_TWITCH_LOAD = 'GAME_TWITCH_LOAD';
export const GAME_TWITCH_LOAD_SUCCESS = 'GAME_TWITCH_LOAD_SUCCESS';
export const GAME_STORES_LOAD = 'GAME_STORES_LOAD';
export const GAME_STORES_LOAD_SUCCESS = 'GAME_STORES_LOAD_SUCCESS';
export const GAME_ADDITIONS_LOAD = 'GAME_ADDITIONS_LOAD';
export const GAME_ADDITIONS_LOAD_SUCCESS = 'GAME_ADDITIONS_LOAD_SUCCESS';
export const GAME_SERIES_LOAD = 'GAME_SERIES_LOAD';
export const GAME_SERIES_LOAD_SUCCESS = 'GAME_SERIES_LOAD_SUCCESS';
export const GAME_PARENTS_LOAD = 'GAME_PARENTS_LOAD';
export const GAME_PARENTS_LOAD_SUCCESS = 'GAME_PARENTS_LOAD_SUCCESS';

export const GAME_CONTRIBUTORS = getLoadingConsts('GAME_CONTRIBUTORS');

export const GAME_PATCHES_LOAD = 'GAME_PATCHES_LOAD';
export const GAME_PATCHES_LOAD_SUCCESS = 'GAME_PATCHES_LOAD_SUCCESS';
export const GAME_DEMO_LOAD = 'GAME_DEMO_LOAD';
export const GAME_DEMO_LOAD_SUCCESS = 'GAME_DEMO_LOAD_SUCCESS';
export const GAME_DEMOS_LOAD = 'GAME_DEMOS_LOAD';
export const GAME_DEMOS_LOAD_SUCCESS = 'GAME_DEMOS_LOAD_SUCCESS';
export const GAME_PATCH_LOAD = 'GAME_PATCH_LOAD';
export const GAME_PATCH_LOAD_SUCCESS = 'GAME_PATCH_LOAD_SUCCESS';
export const GAME_CHEATS_LOAD = 'GAME_CHEATS_LOAD';
export const GAME_CHEATS_LOAD_SUCCESS = 'GAME_CHEATS_LOAD_SUCCESS';
export const GAME_CHEAT_LOAD = 'GAME_CHEAT_LOAD';
export const GAME_CHEAT_LOAD_SUCCESS = 'GAME_CHEAT_LOAD_SUCCESS';
export const GAME_REVIEW_LOAD = 'GAME_REVIEW_LOAD';
export const GAME_REVIEW_LOAD_SUCCESS = 'GAME_REVIEW_LOAD_SUCCESS';

export const GAME_USER_STATUS_UPDATE = 'GAME_USER_STATUS_UPDATE';

export const GAME_USER_COLLECTIONS_LOADING = 'GAME_USER_COLLECTIONS_LOADING';
export const GAME_USER_COLLECTIONS_LOADED = 'GAME_USER_COLLECTION_GAME_LOADED';
export const GAME_USER_COLLECTIONS_LOADING_FAILED = 'GAME_USER_COLLECTIONS_LOADING_FAILED';

export const GAME_USER_COLLECTION_ADDED = 'GAME_USER_COLLECTION_ADDED';
export const GAME_USER_COLLECTION_REMOVED = 'GAME_USER_COLLECTION_REMOVED';

export const GAME_ADFOX_LOAD = 'GAME_ADFOX_LOAD';
export const GAME_ADFOX_LOAD_SUCCESS = 'GAME_ADFOX_LOAD_SUCCESS';

export const PAGE_SIZE = 12;

export function resetGameState() {
  return {
    type: GAME_RESET_STATE,
  };
}

export function loadGame(slug, redirectPathFunc = paths.game) {
  return async (dispatch, getState) => {
    const state = getState();
    const gameUri = `/api/games/${slug}`;

    dispatch({
      type: GAME_LOAD,
    });

    const response = await fetch(gameUri, {
      method: 'get',
      returnBeforeParse: true,
      state,
    });

    if (env.isServer()) {
      const cookies = response.headers.raw()['set-cookie'] || [];
      dispatch(setResponseHeader('Set-Cookie', cookies));
    }

    const game = await response.json();

    if (game.redirect) {
      const url = redirectPathFunc(game.slug);

      makeRedirect(dispatch, url);

      return false;
    }

    if (!game.id) {
      return makeRedirect(dispatch, '/404');
    }

    const item = normalize(game, Schemas.GAME);

    dispatch({
      type: GAME_LOAD_SUCCESS,
      data: {
        results: item,
      },
    });

    return game;
  };
}

export function loadGameAdfox(id) {
  return async (dispatch, getState) => {
    const state = getState();

    let data = {};
    dispatch({ type: GAME_ADFOX_LOAD });

    try {
      data = await fetch(`/api/ad/adfox_parameters?game_id=${id}`, { state });
    } catch {
      //
    } finally {
      dispatch({
        type: GAME_ADFOX_LOAD_SUCCESS,
        data,
      });
    }
  };
}

export function loadGameScreenshot({ gameSlug, imgId }) {
  return async (dispatch, getState) => {
    const state = getState();

    await dispatch({ type: GAME_SCREENSHOT_LOAD });

    const data = await fetch(`/api/games/${gameSlug}/screenshots/${imgId}`, { state });

    await dispatch({
      type: GAME_SCREENSHOT_LOAD_SUCCESS,
      data,
    });
  };
}

export function loadGameScreenshots({ id, page = 1, pageSize = PAGE_SIZE, withDeleted = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/screenshots`;

    dispatch({
      type: GAME_SCREENSHOTS_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size: pageSize, with_deleted: withDeleted },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);
      const results = res.results.map((screen) => ({
        ...screen,
        image: screen.image || screen.source,
      }));

      return dispatch({
        type: GAME_SCREENSHOTS_LOAD_SUCCESS,
        data: {
          count: res.count,
          previous: res.previous,
          next: (url && +url.query.page) || null,
          results,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameMovies(id, page = 1) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/movies`;

    dispatch({
      type: GAME_MOVIES_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_MOVIES_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameCollections(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/collections`;

    dispatch({
      type: GAME_COLLECTIONS_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_COLLECTIONS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameSuggestions(id, page = 1, page_size = PAGE_SIZE, isOnline = false) {
  return async (dispatch) => {
    let endpoint = `/api/games/${id}/suggested`;

    if (isOnline) {
      endpoint = '/api/games/lists/main?discover=true&ordering=-relevance';
    }

    const data = { page, page_size };
    const types = [GAME_SUGGESTIONS_LOAD, GAME_SUGGESTIONS_LOAD_SUCCESS, GAME_SUGGESTIONS_LOAD_FAIL];

    await dispatch({
      id,
      page,
      reload: false,
      [CALL_API]: {
        types,
        schema: Schemas.GAME_ARRAY,
        endpoint,
        data,
      },
    });
  };
}

export function loadGameReviews(gameSlug, page = 1, { ordering = '-created' } = {}, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const reviewsUri = `/api/games/${gameSlug}/reviews`;

    dispatch({
      type: GAME_REVIEWS_LOAD,
    });

    return fetch(reviewsUri, {
      method: 'get',
      data: {
        ordering,
        page,
        page_size,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_REVIEWS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function updateGameReviews(id, { removedReview } = {}) {
  return async (dispatch, getState) => {
    const state = getState();

    const gameUri = `/api/games/${id}`;
    const reviewsUri = `/api/games/${id}/reviews`;

    const [game, reviews] = await Promise.all([
      fetch(gameUri, {
        method: 'get',
        state,
      }),

      fetch(reviewsUri, {
        method: 'get',
        state,
      }),
    ]);

    return dispatch({
      type: GAME_REVIEWS_UPDATE_SUCCESS,
      data: {
        game,
        reviews,
        removedReview,
      },
    });
  };
}

export function loadGamePosts(id, page = 1, { ordering = '-created' } = {}, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const postsUri = `/api/games/${id}/discussions`;

    dispatch({
      type: GAME_POSTS_LOAD,
    });

    return fetch(postsUri, {
      method: 'get',
      data: {
        ordering,
        page,
        page_size,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_POSTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function updateGamePosts(id, { removedPost }) {
  return async (dispatch, getState) => {
    const state = getState();

    const gameUri = `/api/games/${id}`;
    const postsUri = `/api/games/${id}/discussions`;

    const [game, posts] = await Promise.all([
      fetch(gameUri, {
        method: 'get',
        state,
      }),

      fetch(postsUri, {
        method: 'get',
        state,
      }),
    ]);

    return dispatch({
      type: GAME_POSTS_UPDATE_SUCCESS,
      data: {
        game,
        posts,
        removedPost,
      },
    });
  };
}

export function loadGameOwners(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/games/${id}/owned`;

    dispatch({
      type: GAME_OWNERS_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) =>
      dispatch({
        type: GAME_OWNERS_LOAD_SUCCESS,
        data: res,
      }),
    );
  };
}

export function loadGameYoutube(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/games/${id}/youtube`;

    dispatch({
      type: GAME_YOUTUBE_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_YOUTUBE_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameCreators(id, page = 1, pageSize = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/development-team?exclude_current=true&page=${page}&page_size=${pageSize}`;

    dispatch({
      type: GAME_PERSONS_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      const data = normalize(res.results, Schemas.PERSON_ARRAY);

      return dispatch({
        type: GAME_PERSONS_LOAD_SUCCESS,
        data: {
          ...res,
          results: data,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGamePersonGames(id, gameSlug) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games?creators=${id}&exclude=${gameSlug}`;

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) =>
      dispatch({
        type: GAME_PERSON_GAMES_LOAD_NEXT,
        data: res,
        id,
      }),
    );
  };
}

export function loadGameImgur(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/imgur`;

    dispatch({
      type: GAME_IMGUR_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_IMGUR_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameAchievements(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/games/${id}/achievements`;

    dispatch({
      type: GAME_ACHIEVEMENTS_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_ACHIEVEMENTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameReddit(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/games/${id}/reddit`;

    dispatch({
      type: GAME_REDDIT_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_REDDIT_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameTwitch(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/games/${id}/twitch`;

    dispatch({
      type: GAME_TWITCH_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_TWITCH_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameAdditions(id, page = 1, page_size = 40) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/additions`;

    dispatch({ type: GAME_ADDITIONS_LOAD });

    const response = await fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    });

    const url = response.next && urlParse(response.next, true);

    return dispatch({
      type: GAME_ADDITIONS_LOAD_SUCCESS,
      data: {
        ...response,
        next: (url && +url.query.page) || null,
      },
      push: page > 1,
    });
  };
}

export function loadGameSeries(id, page = 1, page_size = 40) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/game-series`;

    dispatch({ type: GAME_SERIES_LOAD });

    const response = await fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    });

    const url = response.next && urlParse(response.next, true);

    return dispatch({
      type: GAME_SERIES_LOAD_SUCCESS,
      data: {
        ...response,
        next: (url && +url.query.page) || null,
      },
      push: page > 1,
    });
  };
}

export function loadGameParents(id, page = 1, page_size = 40) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/parent-games`;

    dispatch({ type: GAME_PARENTS_LOAD });

    const response = await fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    });

    const url = response.next && urlParse(response.next, true);

    return dispatch({
      type: GAME_PARENTS_LOAD_SUCCESS,
      data: {
        ...response,
        next: (url && +url.query.page) || null,
      },
      push: page > 1,
    });
  };
}

export function loadGameContributors(slug, page = 1, page_size = 5) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/leaderboard/games/${slug}`;

    dispatch({ type: GAME_CONTRIBUTORS.started });

    const response = await fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    });

    const url = response.next && urlParse(response.next, true);

    return dispatch({
      type: GAME_CONTRIBUTORS.success,
      data: {
        ...response,
        next: (url && +url.query.page) || null,
      },
      push: page > 1,
    });
  };
}

export function loadGameUserCollections(gameId, gameSlug, search) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.currentUser.id) {
      return undefined;
    }

    dispatch({
      type: GAME_USER_COLLECTIONS_LOADING,
      data: {
        gameSlug,
        search,
      },
    });

    const collections = await fetch(`/api/users/current/collections/${gameId}`, {
      method: 'get',
      data: {
        search,
      },
      state,
    });

    dispatch({
      type: GAME_USER_COLLECTIONS_LOADED,
      data: {
        gameSlug,
        search,
        collections,
      },
    });

    return collections;
  };
}

export function addGameToCollection(collectionId, collectionSlug, gameId, gameSlug) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: GAME_USER_COLLECTION_ADDED,
      data: { collectionId, gameSlug },
    });

    await fetch(`/api/collections/${collectionSlug}/games`, {
      method: 'post',
      data: {
        games: [gameId],
      },
      state,
      parse: false,
    });
  };
}

export function removeGameFromCollection(collectionId, collectionSlug, gameId, gameSlug) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: GAME_USER_COLLECTION_REMOVED,
      data: { collectionId, gameSlug },
    });

    await fetch(`/api/collections/${collectionSlug}/games`, {
      method: 'delete',
      data: {
        games: [gameId],
      },
      parse: false,
      state,
    });
  };
}

// Экшены для AG-версии сайта

export function loadGamePatches(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/patches`;

    dispatch({ type: GAME_PATCHES_LOAD });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_PATCHES_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && parseInt(url.query.page, 10)) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGamePatch(patchId) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/patches/${patchId}`;

    dispatch({ type: GAME_PATCH_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({
        type: GAME_PATCH_LOAD_SUCCESS,
        data,
      });
    });
  };
}

export function loadGameDemos(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/demos`;

    dispatch({ type: GAME_DEMOS_LOAD });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_DEMOS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && parseInt(url.query.page, 10)) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameDemo(demoId) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/demos/${demoId}`;

    dispatch({ type: GAME_DEMO_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({
        type: GAME_DEMO_LOAD_SUCCESS,
        data,
      });
    });
  };
}

export function loadGameCheats(id, page = 1, page_size = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${id}/cheats`;

    dispatch({ type: GAME_CHEATS_LOAD });

    return fetch(uri, {
      method: 'get',
      data: { page, page_size },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: GAME_CHEATS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && parseInt(url.query.page, 10)) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadGameCheat(cheatId) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/cheats/${cheatId}`;

    dispatch({ type: GAME_CHEAT_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({
        type: GAME_CHEAT_LOAD_SUCCESS,
        data,
      });
    });
  };
}

export function loadGameReview(gameSlug) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/editorial-review`;

    dispatch({ type: GAME_REVIEW_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({
        type: GAME_REVIEW_LOAD_SUCCESS,
        data,
      });
    });
  };
}

export function visitedStoreEvent(storeId, gameId) {
  return async (dispatch, getState) => {
    const state = getState();

    await fetch('/api/stat/store-visit', {
      state,
      parse: false,
      method: 'post',
      data: {
        store_id: storeId,
        game_id: gameId,
      },
    });
  };
}
