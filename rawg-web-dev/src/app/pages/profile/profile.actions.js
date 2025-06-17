/* eslint-disable no-nested-ternary */
import { normalize } from 'normalizr';
import urlParse from 'url-parse';

import compactObject from 'tools/compact-object';
import fetch from 'tools/fetch';

import head from 'lodash/head';
import get from 'lodash/get';

import update from 'ramda/src/update';

import { loadCurrentUser } from 'app/components/current-user/current-user.actions';
import paginatedAction from 'redux-logic/action-creators/paginated-action';
import Schemas from 'redux-logic/schemas';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import { PAGE_SIZE } from 'app/pages/game/game.actions';

export const PROFILE_RESET_STATE = 'PROFILE_RESET_STATE';
export const PROFILE_LOAD = 'PROFILE_LOAD';
export const PROFILE_LOAD_SUCCESS = 'PROFILE_LOAD_SUCCESS';

export const PROFILE_PLATFORMS_LOAD = 'PROFILE_PLATFORMS_LOAD';
export const PROFILE_PLATFORMS_LOAD_SUCCESS = 'PROFILE_PLATFORMS_LOAD_SUCCESS';

export const PROFILE_GENRES_LOAD = 'PROFILE_GENRES_LOAD';
export const PROFILE_GENRES_LOAD_SUCCESS = 'PROFILE_GENRES_LOAD_SUCCESS';

export const PROFILE_YEARS_LOAD = 'PROFILE_YEARS_LOAD';
export const PROFILE_YEARS_LOAD_SUCCESS = 'PROFILE_YEARS_LOAD_SUCCESS';

export const PROFILE_STATS_LOAD = 'PROFILE_STATS_LOAD';
export const PROFILE_STATS_LOAD_SUCCESS = 'PROFILE_STATS_LOAD_SUCCESS';

export const PROFILE_RECENTLY_GAMES_LOAD = 'PROFILE_RECENTLY_GAMES_LOAD';
export const PROFILE_RECENTLY_GAMES_LOAD_SUCCESS = 'PROFILE_RECENTLY_GAMES_LOAD_SUCCESS';
export const PROFILE_RECENTLY_GAMES_LOAD_FAILED = 'PROFILE_RECENTLY_GAMES_LOAD_FAILED';

export const PROFILE_FAVOURITE_GAMES_LOAD = 'PROFILE_FAVOURITE_GAMES_LOAD';
export const PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS = 'PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS';
export const PROFILE_FAVOURITE_GAMES_LOAD_FAILED = 'PROFILE_FAVOURITE_GAMES_LOAD_FAILED';
export const PROFILE_FAVOURITE_GAMES_SEARCH = 'PROFILE_FAVOURITE_GAMES_SEARCH';

export const PROFILE_ADD_GAME_TO_FAVOURITES = 'PROFILE_ADD_GAME_TO_FAVOURITES';
export const PROFILE_REMOVE_GAME_FROM_FAVOURITES = 'PROFILE_REMOVE_GAME_FROM_FAVOURITES';

export const PROFILE_GAME_STATUS_CHANGED = 'PROFILE_GAME_STATUS_CHANGED';
export const PROFILE_GAMES_STATUSES_LOAD = 'PROFILE_GAMES_STATUSES_LOAD';
export const PROFILE_GAMES_STATUSES_LOAD_SUCCESS = 'PROFILE_GAMES_STATUSES_LOAD_SUCCESS';
export const PROFILE_GAMES_IMPORT_SUBMIT = 'PROFILE_GAMES_IMPORT_SUBMIT';
export const PROFILE_COLLECTIONS_CREATED_LOAD = 'PROFILE_COLLECTIONS_CREATED_LOAD';
export const PROFILE_COLLECTIONS_CREATED_LOAD_SUCCESS = 'PROFILE_COLLECTIONS_CREATED_LOAD_SUCCESS';
export const PROFILE_COLLECTIONS_FOLLOWING_LOAD = 'PROFILE_COLLECTIONS_FOLLOWING_LOAD';
export const PROFILE_COLLECTIONS_FOLLOWING_LOAD_SUCCESS = 'PROFILE_COLLECTIONS_FOLLOWING_LOAD_SUCCESS';
export const PROFILE_CONNECTIONS_FOLLOWING_LOAD = 'PROFILE_CONNECTIONS_FOLLOWING_LOAD';
export const PROFILE_CONNECTIONS_FOLLOWING_LOAD_SUCCESS = 'PROFILE_CONNECTIONS_FOLLOWING_LOAD_SUCCESS';
export const PROFILE_CONNECTIONS_FOLLOWERS_LOAD = 'PROFILE_CONNECTIONS_FOLLOWERS_LOAD';
export const PROFILE_CONNECTIONS_FOLLOWERS_LOAD_SUCCESS = 'PROFILE_CONNECTIONS_FOLLOWERS_LOAD_SUCCESS';
export const PROFILE_FOLLOW_UNFOLLOW_USER = 'PROFILE_FOLLOW_UNFOLLOW_USER';
export const PROFILE_FOLLOW_USER_SUCCESS = 'PROFILE_FOLLOW_USER_SUCCESS';
export const PROFILE_UNFOLLOW_USER_SUCCESS = 'PROFILE_UNFOLLOW_USER_SUCCESS';
export const PROFILE_REVIEWS_LOAD = 'PROFILE_REVIEWS_LOAD';
export const PROFILE_REVIEWS_LOAD_SUCCESS = 'PROFILE_REVIEWS_LOAD_SUCCESS';
export const PROFILE_REVIEWS_UPDATE_SUCCESS = 'PROFILE_REVIEWS_UPDATE_SUCCESS';
export const PROFILE_TOP_REVIEWS_LOAD = 'PROFILE_TOP_REVIEWS_LOAD';
export const PROFILE_TOP_REVIEWS_LOAD_SUCCESS = 'PROFILE_TOP_REVIEWS_LOAD_SUCCESS';
export const PROFILE_TOP_PERSONS_LOAD = 'PROFILE_TOP_PERSONS_LOAD';
export const PROFILE_TOP_PERSONS_LOAD_SUCCESS = 'PROFILE_TOP_PERSONS_LOAD_SUCCESS';
export const PROFILE_GAMES_PLATFORMS_REPLACE = 'PROFILE_GAMES_PLATFORMS_REPLACE';
export const PROFILE_UNRATED_GAMES_LOAD = 'PROFILE_UNRATED_GAMES_LOAD';
export const PROFILE_UNRATED_GAMES_LOAD_SUCCESS = 'PROFILE_UNRATED_GAMES_LOAD_SUCCESS';
export const PROFILE_REMOVE_RATED_GAME = 'PROFILE_REMOVE_RATED_GAME';
export const PROFILE_UNLOAD_UNRATED_GAMES = 'PROFILE_UNLOAD_UNRATED_GAMES';

export const gamesOnPage = 12;

export function resetProfileState() {
  return {
    type: PROFILE_RESET_STATE,
  };
}

const apiCurrentUserGames = '/api/users/current/games';

export function loadProfile(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const profileUri = `/api/users/${id}`;
    const profilePlatformsUri = `/api/users/${id}/games/platforms/parents`;
    const profileGenresUri = `/api/users/${id}/games/genres`;
    const profileYearsUri = `/api/users/${id}/games/years`;

    dispatch({ type: PROFILE_LOAD });
    dispatch({ type: PROFILE_PLATFORMS_LOAD });
    dispatch({ type: PROFILE_GENRES_LOAD });
    dispatch({ type: PROFILE_YEARS_LOAD });

    const [profile, profilePlatforms, profileGenres, profileYears] = await Promise.allSettled([
      fetch(profileUri, {
        method: 'get',
        state,
      }),

      fetch(profilePlatformsUri, {
        method: 'get',
        state,
      }),

      fetch(profileGenresUri, {
        method: 'get',
        state,
      }),

      fetch(profileYearsUri, {
        method: 'get',
        state,
      }),
    ]);

    if (profile.status === 'fulfilled') {
      dispatch({ type: PROFILE_LOAD_SUCCESS, data: profile.value });
    }

    if (profilePlatforms.status === 'fulfilled') {
      dispatch({ type: PROFILE_PLATFORMS_LOAD_SUCCESS, data: profilePlatforms.value.results });
    }

    if (profileGenres.status === 'fulfilled') {
      dispatch({ type: PROFILE_GENRES_LOAD_SUCCESS, data: profileGenres.value.results });
    }

    if (profileYears.status === 'fulfilled') {
      dispatch({ type: PROFILE_YEARS_LOAD_SUCCESS, data: profileYears.value.results });
    }
  };
}

export function loadProfileStats(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/statistics`;

    dispatch({ type: PROFILE_STATS_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) =>
      dispatch({
        type: PROFILE_STATS_LOAD_SUCCESS,
        data: res,
      }),
    );
  };
}

export const loadProfileRecentlyGames = paginatedAction({
  endpoint: (action) => `/api/users/${action.id}/games/recently`,
  dataPath: 'profile.recentlyGames',
  reload: false,
  types: [PROFILE_RECENTLY_GAMES_LOAD, PROFILE_RECENTLY_GAMES_LOAD_SUCCESS, PROFILE_RECENTLY_GAMES_LOAD_FAILED],
  schema: Schemas.GAME_ARRAY,
});

export const loadProfileFavouriteGames = paginatedAction({
  pageSize: 10,
  endpoint: (action) => `/api/users/${action.id}/favorites`,
  dataPath: 'profile.favouriteGames',
  reload: false,
  types: [PROFILE_FAVOURITE_GAMES_LOAD, PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS, PROFILE_FAVOURITE_GAMES_LOAD_FAILED],
  schema: Schemas.GAME_ARRAY,
});

export function addProfileFavouriteGame({ position, game }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/users/current/favorites';
    const userSlug = state.profile.user.slug;
    const currentFavourites = get(state, `profile.favouriteGames[${userSlug}]`);
    const denormalizedGames = denormalizeGamesArr(state, `profile.favouriteGames[${userSlug}].items`);
    const games = update(position, game, denormalizedGames);
    const results = normalize(games, Schemas.GAME_ARRAY);

    dispatch({
      type: PROFILE_ADD_GAME_TO_FAVOURITES,
      data: {
        userSlug,
        game,
        position,
      },
    });

    dispatch({
      type: PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS,
      id: userSlug,
      data: {
        count: currentFavourites.count,
        results,
      },
    });

    return fetch(uri, {
      method: 'post',
      data: {
        game: game.id,
        position,
      },
      state,
    });
  };
}

export function removeProfileFavouriteGame({ position }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/current/favorites/${position}`;

    dispatch({
      type: PROFILE_REMOVE_GAME_FROM_FAVOURITES,
      data: {
        userSlug: state.profile.user.slug,
        position,
      },
    });

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });
  };
}

export function findProfileFavouriteGames(search = '') {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games';

    const res = await fetch(uri, {
      method: 'get',
      data: {
        search,
      },
      state,
    });

    dispatch({
      type: PROFILE_FAVOURITE_GAMES_SEARCH,
      data: {
        results: normalize(res.results, Schemas.GAME_ARRAY),
      },
    });

    return res;
  };
}

export function loadProfileGamesByStatus({ id, page = 1, filter = {}, search }) {
  return async (dispatch, getState) => {
    const state = getState();
    const status = filter && filter.statuses && filter.statuses[0];
    const uri = `/api/users/${id}/games`;
    const method = 'get';

    const data = compactObject({
      ...filter,
      // page_size: page === 1 ? 8 : 24,
      page_size: gamesOnPage,
      page,
      search,
    });

    dispatch({
      type: PROFILE_GAMES_STATUSES_LOAD,
      data: {
        page,
        status,
      },
    });

    return fetch(uri, { method, data, state }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_GAMES_STATUSES_LOAD_SUCCESS,
        data: {
          ...res,
          status,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadProfileCollectionsCreated(id, next) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/collections`;

    dispatch({ type: PROFILE_COLLECTIONS_CREATED_LOAD });

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_COLLECTIONS_CREATED_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function loadProfileCollectionsFollowing(id, next) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/following/collections`;

    dispatch({ type: PROFILE_COLLECTIONS_FOLLOWING_LOAD });

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_COLLECTIONS_FOLLOWING_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function loadProfileConnectionsFollowing(id, next) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/following/users`;

    dispatch({ type: PROFILE_CONNECTIONS_FOLLOWING_LOAD });

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_CONNECTIONS_FOLLOWING_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function loadProfileConnectionsFollowers(id, next) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/followers`;

    dispatch({ type: PROFILE_CONNECTIONS_FOLLOWERS_LOAD });

    return fetch(uri, {
      method: 'get',
      data: {
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_CONNECTIONS_FOLLOWERS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function setBackground(game) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/users/current';

    return fetch(uri, {
      method: 'patch',
      data: {
        game_background: game.id,
      },
      state,
    }).then((res) => {
      dispatch({
        type: PROFILE_LOAD_SUCCESS,
        data: res,
      });

      // обновим объект текущего пользователя, чтобы поле с фоном также обновилось и там
      return dispatch(loadCurrentUser());
    });
  };
}

export function followUser(user) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/users/current/following/users';

    dispatch({ type: PROFILE_FOLLOW_UNFOLLOW_USER });

    return fetch(uri, {
      method: 'post',
      data: {
        follow: user.id,
      },
      state,
    }).then(() =>
      /* res */ dispatch({
        type: PROFILE_FOLLOW_USER_SUCCESS,
      }),
    );
  };
}

export function unfollowUser(user) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/current/following/users/${user.id}`;

    dispatch({ type: PROFILE_FOLLOW_UNFOLLOW_USER });

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    }).then(() =>
      /* res */ dispatch({
        type: PROFILE_UNFOLLOW_USER_SUCCESS,
      }),
    );
  };
}

export function loadProfileReviews(id, next, { rating = null, onlyReviews = false } = {}) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/reviews`;

    dispatch({ type: PROFILE_REVIEWS_LOAD });

    const data = {
      page: next,
      page_size: PAGE_SIZE,
    };

    if (typeof rating === 'number') {
      data.rating = rating;
    }

    if (onlyReviews) {
      data.is_text = true;
    }

    return fetch(uri, {
      method: 'get',
      data,
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      return dispatch({
        type: PROFILE_REVIEWS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function updateProfileReviews(id, { removedReview }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/reviews`;

    return fetch(uri, {
      method: 'get',
      data: {
        page: 1,
      },
      state,
    }).then((res) =>
      dispatch({
        type: PROFILE_REVIEWS_UPDATE_SUCCESS,
        data: {
          reviews: res,
          removedReview,
        },
      }),
    );
  };
}

export function loadProfileTopReviews(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/reviews/top`;

    dispatch({ type: PROFILE_TOP_REVIEWS_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) =>
      dispatch({
        type: PROFILE_TOP_REVIEWS_LOAD_SUCCESS,
        data: res,
      }),
    );
  };
}

export function loadProfileTopPersons(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/users/${id}/persons`;

    dispatch({ type: PROFILE_TOP_PERSONS_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) =>
      dispatch({
        type: PROFILE_TOP_PERSONS_LOAD_SUCCESS,
        data: res,
      }),
    );
  };
}

export function multipleEditStatus(status, games) {
  return async (dispatch, getState) => {
    const state = getState();
    const gameIds = games.map((g) => g.id);

    return fetch(apiCurrentUserGames, {
      method: 'patch',
      data: {
        status,
        games: gameIds,
      },
      state,
    });
  };
}

export function gameStatusChanged({ id, page, search, filter, newStatus, oldStatus, game }) {
  /* eslint-disable no-mixed-operators */
  return async (dispatch, getState) => {
    const callDispatch = (newGameData) => {
      dispatch({
        type: PROFILE_GAME_STATUS_CHANGED,
        data: {
          newStatus,
          oldStatus,
          game,
          filter,
          newGame: newGameData && head(newGameData.results),
        },
      });
    };

    if (page) {
      const state = getState();
      const uri = `/api/users/${id}/games`;
      const method = 'get';
      const data = compactObject({
        ...filter,
        statuses: [oldStatus],
        offset: Math.max((page - 1) * gamesOnPage - 1, 0),
        search,
        page_size: 1,
        page: 1,
      });

      return fetch(uri, { method, data, state }).then(callDispatch);
    }

    return callDispatch();
  };
}

export function multipleEditPlatforms(platforms, games, { platforms: platformObjects }) {
  return async (dispatch, getState) => {
    const state = getState();

    return fetch(apiCurrentUserGames, {
      method: 'patch',
      data: {
        platforms,
        games,
      },
      state,
    }).then((res) => {
      dispatch({
        type: PROFILE_GAMES_PLATFORMS_REPLACE,
        data: {
          platforms: platformObjects,
          gameIds: games,
        },
      });

      return res;
    });
  };
}

export function multipleAddToCollections(collections, games) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/collections/collections_games';

    return fetch(uri, {
      method: 'post',
      data: {
        collections,
        games,
      },
      state,
    });
  };
}

export function multipleDelete(games) {
  return async (dispatch, getState) => {
    const state = getState();

    return fetch(apiCurrentUserGames, {
      method: 'delete',
      data: {
        games,
      },
      state,
    });
  };
}

export function multipleUndo(res, action) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = action === 'collections' ? '/api/collections/collections_games' : apiCurrentUserGames;

    return fetch(uri, {
      method: action === 'collections' ? 'delete' : action === 'delete' ? 'post' : 'patch',
      data: res,
      parse: false,
      state,
    });
  };
}

export function multipleLoadCollections(search = '') {
  return async (dispatch, getState) => {
    const state = getState();
    const { currentUser } = state;

    const uri = `/api/users/${currentUser.id}/collections`;

    const data = {
      page: 1,
    };

    if (search) {
      data.search = search;
    }

    return fetch(uri, {
      method: 'get',
      data,
      state,
    });
  };
}

export function loadUnratedGames({ page = 0, pageSize = 10, offset = 0 } = {}) {
  return async (dispatch, getState) => {
    const state = getState();
    const queryOffset = page * pageSize - offset;
    const uri = '/api/reviews/carousel';

    dispatch({ type: PROFILE_UNRATED_GAMES_LOAD });

    return fetch(uri, {
      method: 'get',
      data: {
        page_size: pageSize,
        offset: queryOffset,
      },
      state,
    }).then((res) => {
      dispatch({
        type: PROFILE_UNRATED_GAMES_LOAD_SUCCESS,
        data: res,
        push: page > 0,
      });
    });
  };
}

export function removeRatedGame(currentSlide) {
  return async (dispatch) => {
    dispatch({
      type: PROFILE_REMOVE_RATED_GAME,
      data: {
        currentSlide,
      },
    });
  };
}

export function unloadRatedGames(count) {
  return async (dispatch) => {
    dispatch({
      type: PROFILE_UNLOAD_UNRATED_GAMES,
      data: {
        count,
      },
    });
  };
}
