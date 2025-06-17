import omit from 'lodash/omit';
import values from 'lodash/values';

import formatNumber from 'tools/format-number';

import { changeInfo } from 'app/pages/settings/settings.actions';
import { GAME_STATUS_TOPLAY, GAME_STATUS_OWNED, GAME_ADDED_STATUSES } from 'app/pages/game/game.types';

import { createGameStatus, editGameStatus, removeGameStatus, editGamePlatforms } from './game-menu.actions';

export function addToWishlist(dispatch, game) {
  const { user_game: userGame } = game;
  const status = GAME_STATUS_TOPLAY;
  const inLibrary = userGame && userGame.status !== status;
  const inWishlist = userGame && userGame.status === status;

  if (inWishlist) {
    return dispatch(removeGameStatus({ game }));
  }

  if (inLibrary) {
    return dispatch(
      editGameStatus({
        game,
        status,
        oldStatus: userGame.status,
      }),
    );
  }

  return dispatch(createGameStatus({ game, status }));
}

export function saveGameStatus(dispatch, game, status = GAME_STATUS_OWNED) {
  const { user_game: userGame } = game;

  if (!userGame) {
    return dispatch(createGameStatus({ game, status }));
  }

  return dispatch(
    editGameStatus({
      game,
      status,
      oldStatus: userGame.status,
    }),
  );
}

export function updatePlatforms(dispatch, game, platformId) {
  const platforms = platformId ? [platformId] : [];

  return dispatch(editGamePlatforms({ game, platforms }));
}

export function removeGame(dispatch, game) {
  return dispatch(removeGameStatus({ game }));
}

export function skipPlatformsUpdate(dispatch) {
  return dispatch(changeInfo({ select_platform: false }));
}

export function isAdded(userGame) {
  return userGame && GAME_ADDED_STATUSES.includes(userGame.status);
}

export function isWishlist(userGame) {
  return userGame && userGame.status === GAME_STATUS_TOPLAY;
}

export function getAdded(addedByStatus) {
  if (!addedByStatus) return 0;

  const withoutWishlist = omit(addedByStatus, [GAME_STATUS_TOPLAY]);
  const added = values(withoutWishlist).reduce((fullCount, count) => fullCount + count, 0);

  if (!added) return 0;

  return formatNumber(added);
}

export function getAddedToWishlist(addedByStatus) {
  if (!addedByStatus) return 0;

  const { toplay = 0 } = addedByStatus;

  return formatNumber(toplay);
}
