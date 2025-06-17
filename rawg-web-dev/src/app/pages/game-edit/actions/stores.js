import has from 'lodash/has';

import fetch from 'tools/fetch';
import denormalizeGame from 'tools/redux/denormalize-game';

import {
  addNotification,
  EXPIRES_IMMEDIATELY,
  NOTIF_STATUS_ERROR,
} from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_GAME_EDIT_STORE_NOT_FOUND } from 'app/pages/app/components/notifications/notifications.constants';

import trans from 'tools/trans';
import { prepareAddObjectsData, prepareUpdateObjectsData } from 'app/pages/game-edit/game-edit.helper';
import { loadGame } from 'app/pages/game/game.actions';
import {
  getPropertiesOfSuccessNotification,
  getPropertiesOfErrorNotification,
} from 'app/pages/game-edit/actions/common';

export const GAME_EDIT_STORES_FILL = 'GAME_EDIT_STORES_FILL';
export const GAME_EDIT_STORES_UPDATE_START = 'GAME_EDIT_STORES_UPDATE_START';
export const GAME_EDIT_STORES_UPDATE_FINISH = 'GAME_EDIT_STORES_UPDATE_FINISH';
export const GAME_EDIT_STORES_ERROR = 'GAME_EDIT_STORES_ERROR';
export const GAME_EDIT_STORES_NOT_FOUND = 'GAME_EDIT_STORES_NOT_FOUND';

export function viewStoreNotFoundError() {
  return addNotification({
    id: LOCAL_GAME_EDIT_STORE_NOT_FOUND,
    weight: 8,
    local: true,
    fixed: true,
    authenticated: true,
    expires: EXPIRES_IMMEDIATELY,
    status: NOTIF_STATUS_ERROR,
    message: trans('game_edit.field_stores_store_not_found'),
  });
}

export function fillEditGameStores(stores) {
  return {
    type: GAME_EDIT_STORES_FILL,
    data: {
      stores,
    },
  };
}

function setStoreFieldError(item, error) {
  return {
    type: GAME_EDIT_STORES_ERROR,
    data: {
      item,
      error,
    },
  };
}

function setStoreField404(item) {
  return {
    type: GAME_EDIT_STORES_NOT_FOUND,
    data: {
      item,
    },
  };
}

function addGameStores() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/stores`;
    const dataList = prepareAddObjectsData(state.gameEdit.stores);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */

        await fetch(uri, {
          method: 'post',
          state,
          data: {
            store: dataList[data].id,
            url: dataList[data].url,
          },
        }).catch((error) => {
          if (error.errors) {
            dispatch(setStoreFieldError(dataList[data], error));
          } else {
            dispatch(setStoreField404(dataList[data]));
          }

          throw error;
        });
      }
    }
  };
}

function updateGameStores() {
  return async (dispatch, getState) => {
    const state = getState();
    const dataList = prepareUpdateObjectsData(state.gameEdit.stores);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */
        const { deleted } = state.gameEdit.stores;
        const uri = `/api/games/${denormalizeGame(state).slug}/stores/${dataList[data].resourceId}`;
        const method = deleted.includes(dataList[data].id) ? 'delete' : 'patch';

        await fetch(uri, {
          method,
          state,
          data: {
            store: dataList[data].id,
            url: dataList[data].url,
          },
        }).catch((error) => {
          if (method === 'patch' && error.errors) {
            dispatch(setStoreFieldError(dataList[data], error));
            throw error;
          } else {
            dispatch(setStoreField404(dataList[data]));
          }
        });
      }
    }
  };
}

function loadUpdatedStores(dispatch, slug) {
  Promise.resolve(dispatch(loadGame(slug))).then((res) => {
    dispatch(fillEditGameStores(res.stores));
  });
}

export function updateGameStoresData() {
  return async (dispatch, getState) => {
    dispatch({ type: GAME_EDIT_STORES_UPDATE_START });

    Promise.all([dispatch(addGameStores()), dispatch(updateGameStores())])
      .then(() => {
        const game = denormalizeGame(getState());

        loadUpdatedStores(dispatch, game.slug);

        dispatch({ type: GAME_EDIT_STORES_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfSuccessNotification()));
      })
      .catch((error) => {
        dispatch({ type: GAME_EDIT_STORES_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfErrorNotification(error)));
      });
  };
}
