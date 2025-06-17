import has from 'lodash/has';

import prop from 'ramda/src/prop';

import fetch from 'tools/fetch';
import getPagesCount from 'tools/get-pages-count';
import denormalizeGame from 'tools/redux/denormalize-game';

import { addNotification } from 'app/pages/app/components/notifications/notifications.actions';

import {
  getPropertiesOfSuccessNotification,
  getPropertiesOfErrorNotification,
} from 'app/pages/game-edit/actions/common';

import getLoadingConsts from 'tools/redux/get-loading-consts';
import { prepareAddObjectsData, prepareUpdateObjectsData } from 'app/pages/game-edit/game-edit.helper';

export const GAME_EDIT_CREATORS_FILL_STARTED = 'GAME_EDIT_CREATORS_FILL_STARTED';
export const GAME_EDIT_CREATORS_FILL = 'GAME_EDIT_CREATORS_FILL';

export const GAME_EDIT_CREATORS_UPDATE_START = 'GAME_EDIT_CREATORS_UPDATE_START';
export const GAME_EDIT_CREATORS_UPDATE_FINISH = 'GAME_EDIT_CREATORS_UPDATE_FINISH';

export const GAME_EDIT_CREATORS_ERROR = 'GAME_EDIT_CREATORS_ERROR';
export const GAME_EDIT_CREATORS_NOT_FOUND = 'GAME_EDIT_CREATORS_NOT_FOUND';

export const SEARCH_CREATORS_STARTED = 'SEARCH_CREATORS_STARTED';
export const SEARCH_CREATORS_FINISHED = 'SEARCH_CREATORS_FINISHED';

export const CREATORS_LOAD_POSITIONS = getLoadingConsts('CREATORS_LOAD_POSITIONS');

export function loadCreatorsPositions() {
  return async (dispatch, getState) => {
    const state = getState();
    const method = 'get';

    dispatch({ type: CREATORS_LOAD_POSITIONS.started });

    const response = await fetch('/api/creator-roles', { state, method });

    dispatch({
      type: CREATORS_LOAD_POSITIONS.success,
      data: {
        positions: response.results,
      },
    });
  };
}

export function loadAllGameCreators(slug) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${slug}/development-team`;
    const method = 'get';
    const pageSize = 12;
    const fetchData = (page) => ({ method, state, data: { page_size: pageSize, page } });

    const fillCreators = async (page) => {
      const creatorsBunch = await fetch(uri, fetchData(page));

      if (page === 1) {
        dispatch({ type: GAME_EDIT_CREATORS_FILL_STARTED });
      }

      dispatch({
        type: GAME_EDIT_CREATORS_FILL,
        data: creatorsBunch,
      });

      return creatorsBunch.count;
    };

    const count = await fillCreators(1);
    const pagesCount = getPagesCount(count, pageSize);

    if (pagesCount > 1) {
      let page = 2;
      while (page <= pagesCount) {
        await fillCreators(page);
        page += 1;
      }
    }
  };
}

export function searchCreators(value) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/creators?search=${value}`;

    dispatch({ type: SEARCH_CREATORS_STARTED });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SEARCH_CREATORS_FINISHED,
        data: {
          value,
          items: res.results,
        },
      });
    });
  };
}

function setCreatorFieldError(item, error) {
  return {
    type: GAME_EDIT_CREATORS_ERROR,
    data: {
      item,
      error,
    },
  };
}

function setCreatorField404(item) {
  return {
    type: GAME_EDIT_CREATORS_NOT_FOUND,
    data: {
      item,
    },
  };
}

function addGameCreators() {
  return async (dispatch, getState) => {
    const state = getState();
    const { slug } = denormalizeGame(state);
    const uri = `/api/games/${slug}/development-team`;
    const dataList = prepareAddObjectsData(state.gameEdit.creators);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */

        await fetch(uri, {
          method: 'post',
          state,
          data: {
            person: dataList[data].id,
            positions: dataList[data].positions.map(prop('id')),
          },
        }).catch((error) => {
          if (error.errors) {
            dispatch(setCreatorFieldError(dataList[data], error));
          } else {
            dispatch(setCreatorField404(dataList[data]));
          }

          throw error;
        });
      }
    }
  };
}

function updateGameCreators() {
  return async (dispatch, getState) => {
    const state = getState();
    const dataList = prepareUpdateObjectsData(state.gameEdit.creators);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */
        const { deleted } = state.gameEdit.creators;
        const { slug } = denormalizeGame(state);
        const uri = `/api/games/${slug}/development-team/${dataList[data].id}`;
        const method = deleted.includes(dataList[data].id) ? 'delete' : 'patch';

        await fetch(uri, {
          method,
          state,
          data: {
            positions: dataList[data].positions.map(prop('id')),
          },
        }).catch((error) => {
          if (method === 'patch' && error.errors) {
            dispatch(setCreatorFieldError(dataList[data], error));
            throw error;
          } else {
            dispatch(setCreatorField404(dataList[data]));
          }
        });
      }
    }
  };
}

export function updateGameCreatorsData() {
  return async (dispatch, getState) => {
    dispatch({ type: GAME_EDIT_CREATORS_UPDATE_START });

    Promise.all([dispatch(addGameCreators()), dispatch(updateGameCreators())])
      .then(() => {
        const game = denormalizeGame(getState());

        dispatch(loadAllGameCreators(game.slug));
        dispatch({ type: GAME_EDIT_CREATORS_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfSuccessNotification()));
      })
      .catch((error) => {
        dispatch({ type: GAME_EDIT_CREATORS_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfErrorNotification(error)));
      });
  };
}
