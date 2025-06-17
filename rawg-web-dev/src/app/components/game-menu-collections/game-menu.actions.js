/* eslint-disable no-console */

import get from 'lodash/get';

import fetch from 'tools/fetch';

import { sendAnalyticsGameStatus } from 'scripts/analytics-helper';
import { GAME_STATUS_UPDATED } from 'redux-logic/reducers/games';
import { updatePlatforms } from 'app/components/game-menu-collections/game-menu.helper';

export const GAME_STATUS_CREATE = 'GAME_STATUS_CREATE';
export const GAME_STATUS_CHANGE = 'GAME_STATUS_CHANGE';
export const GAME_STATUS_DELETE = 'GAME_STATUS_DELETE';
export const GAME_STATUS_PLATFORMS_LOAD_SUCCESS = 'GAME_STATUS_PLATFORMS_LOAD_SUCCESS';

const updateAddedByStatus = ({ game, oldStatus, status }) => {
  if (oldStatus && status && oldStatus !== status) {
    return {
      ...game.added_by_status,
      [oldStatus]: Math.max(0, get(game, `added_by_status.${oldStatus}`, 0) - 1),
      [status]: Math.max(0, get(game, `added_by_status.${status}`, 0) + 1),
    };
  }

  if (status && !oldStatus) {
    return {
      ...game.added_by_status,
      [status]: Math.max(0, get(game, `added_by_status.${status}`, 0) + 1),
    };
  }

  if (!status && oldStatus) {
    return {
      ...game.added_by_status,
      [oldStatus]: Math.max(0, get(game, `added_by_status.${oldStatus}`, 0) - 1),
    };
  }

  return game.added_by_status;
};

function updateGameStatus(res, game, dispatch) {
  dispatch({
    type: GAME_STATUS_UPDATED,
    data: {
      gameSlug: game.slug,
      userGame: res.status
        ? {
            status: res.status,

            // тут с бека передаются номера платформ, но по факту
            // туда надо сувать сущности, а не просто номера
            // platforms: res.platforms,
          }
        : null,
      added: res.added,
      addedByStatus: res.addedByStatus,
    },
  });
}

export function createGameStatus({ game, status, platforms }) {
  return async (dispatch, getState) => {
    const state = getState();

    sendAnalyticsGameStatus(status);

    dispatch({
      type: GAME_STATUS_CREATE,
      data: {
        id: game.id,
        status,
      },
    });

    const data = {
      game: game.id,
      status,
    };

    if (platforms) {
      data.platforms = platforms;
    }

    const addedByStatus = updateAddedByStatus({ game, status });
    const added = game.added + 1;

    const response = await fetch('/api/users/current/games', {
      sendCurrentPageInsteadPrevious: true,
      method: 'post',
      data,
      state,
    });

    updateGameStatus({ ...response, added, addedByStatus }, game, dispatch);

    const gamePlatformsCount = get(game, 'platforms.length');
    if (gamePlatformsCount === 1) {
      const platformId = get(game, 'platforms[0].platform.id');
      if (platformId) {
        updatePlatforms(dispatch, game, platformId);
      }
    }
  };
}

export function editGameStatus({ game, status, oldStatus }) {
  return async (dispatch, getState) => {
    const state = getState();

    sendAnalyticsGameStatus(status);

    dispatch({
      type: GAME_STATUS_CHANGE,
      data: {
        id: game.id,
        oldStatus,
        status,
      },
    });

    const uri = `/api/users/current/games/${game.id}`;
    const addedByStatus = updateAddedByStatus({ game, oldStatus, status });
    const { added } = game;

    return fetch(uri, {
      sendCurrentPageInsteadPrevious: true,
      method: 'patch',
      data: {
        status,
      },
      state,
    }).then((res) => {
      updateGameStatus({ ...res, added, addedByStatus }, game, dispatch);
    });
  };
}

export function removeGameStatus({ game }) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: GAME_STATUS_DELETE,
      data: {
        id: game.id,
        status: null,
      },
    });

    const uri = `/api/users/current/games/${game.id}`;
    const oldStatus = get(game, 'user_game.status');
    const status = null;
    const addedByStatus = updateAddedByStatus({ game, oldStatus, status });
    const added = game.added - 1;

    return fetch(uri, {
      sendCurrentPageInsteadPrevious: true,
      method: 'delete',
      parse: false,
      state,
    }).then((res) => {
      updateGameStatus({ ...res, added, addedByStatus }, game, dispatch);
    });
  };
}

export function editGamePlatforms({ game, platforms }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/users/current/games/${game.id}`;
    const { added, added_by_status: addedByStatus } = game;

    return fetch(uri, {
      sendCurrentPageInsteadPrevious: true,
      method: 'patch',
      data: {
        platforms,
      },
      state,
    }).then((res) => {
      updateGameStatus({ ...res, added, addedByStatus }, game, dispatch);
    });
  };
}
