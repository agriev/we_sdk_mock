import has from 'lodash/has';

import fetch from 'tools/fetch';
import denormalizeGame from 'tools/redux/denormalize-game';

import getPagesCount from 'tools/get-pages-count';

import { prepareAddObjectsData, prepareUpdateObjectsData } from 'app/pages/game-edit/game-edit.helper';

export const GAME_EDIT_ADDITIONS_ERROR = 'GAME_EDIT_ADDITIONS_ERROR';
export const GAME_EDIT_ADDITIONS_NOT_FOUND = 'GAME_EDIT_ADDITIONS_NOT_FOUND';

export const GAME_EDIT_ADDITIONS_FILL_STARTED = 'GAME_EDIT_ADDITIONS_FILL_STARTED';
export const GAME_EDIT_ADDITIONS_FILL = 'GAME_EDIT_ADDITIONS_FILL';

function setAdditionFieldError(item, error) {
  return {
    type: GAME_EDIT_ADDITIONS_ERROR,
    data: {
      item,
      error,
    },
  };
}

function setAdditionField404(item) {
  return {
    type: GAME_EDIT_ADDITIONS_NOT_FOUND,
    data: {
      item,
    },
  };
}

export function loadAllGameAdditions(slug) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${slug}/additions`;
    const method = 'get';
    const pageSize = 12;
    const fetchData = (page) => ({ method, state, data: { page_size: pageSize, page } });

    const fillAdditions = async (page) => {
      const additionsBunch = await fetch(uri, fetchData(page));

      if (page === 1) {
        dispatch({ type: GAME_EDIT_ADDITIONS_FILL_STARTED });
      }

      dispatch({
        type: GAME_EDIT_ADDITIONS_FILL,
        data: additionsBunch,
      });

      return additionsBunch.count;
    };

    const count = await fillAdditions(1);
    const pagesCount = getPagesCount(count, pageSize);

    if (pagesCount > 1) {
      let page = 2;

      while (page <= pagesCount) {
        await fillAdditions(page);
        page += 1;
      }
    }
  };
}

function addGameAdditions() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/additions`;
    const dataList = prepareAddObjectsData(state.gameEdit.additions);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */
        await fetch(uri, {
          method: 'post',
          state,
          data: {
            game: dataList[data].id,
          },
        }).catch((error) => {
          if (error.errors) {
            dispatch(setAdditionFieldError(dataList[data], error));
          } else {
            dispatch(setAdditionField404(dataList[data]));
          }

          throw error;
        });
      }
    }
  };
}

function removeGameAdditions() {
  return async (dispatch, getState) => {
    const state = getState();
    const dataList = prepareUpdateObjectsData(state.gameEdit.additions);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */
        const { deleted } = state.gameEdit.additions;
        if (deleted.includes(dataList[data].id)) {
          console.log('DELETE', dataList[data].slug);

          await fetch(`/api/games/${denormalizeGame(state).slug}/additions/${dataList[data].id}`, {
            method: 'delete',
            state,
          }).catch((error) => {
            dispatch(setAdditionField404(dataList[data]));
          });
        }
      }
    }
  };
}

export function updateGameAdditionsData() {
  return async (dispatch, getState) => {
    await Promise.all([dispatch(addGameAdditions()), dispatch(removeGameAdditions())]).then(() => {
      const game = denormalizeGame(getState());

      dispatch(loadAllGameAdditions(game.slug));
    });
  };
}
