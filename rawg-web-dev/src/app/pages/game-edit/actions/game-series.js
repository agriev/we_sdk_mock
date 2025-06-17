import has from 'lodash/has';

import fetch from 'tools/fetch';
import denormalizeGame from 'tools/redux/denormalize-game';

import getPagesCount from 'tools/get-pages-count';

import { prepareAddObjectsData, prepareUpdateObjectsData } from 'app/pages/game-edit/game-edit.helper';

export const GAME_EDIT_GAMESERIES_ERROR = 'GAME_EDIT_GAMESERIES_ERROR';
export const GAME_EDIT_GAMESERIES_NOT_FOUND = 'GAME_EDIT_GAMESERIES_NOT_FOUND';

export const GAME_EDIT_GAMESERIES_FILL_STARTED = 'GAME_EDIT_GAMESERIES_FILL_STARTED';
export const GAME_EDIT_GAMESERIES_FILL = 'GAME_EDIT_GAMESERIES_FILL';

function setGameSeriesFieldError(item, error) {
  return {
    type: GAME_EDIT_GAMESERIES_ERROR,
    data: {
      item,
      error,
    },
  };
}

function setGameSeriesField404(item) {
  return {
    type: GAME_EDIT_GAMESERIES_NOT_FOUND,
    data: {
      item,
    },
  };
}

export function loadAllGameSeries(slug) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${slug}/game-series`;
    const method = 'get';
    const pageSize = 12;
    const fetchData = (page) => ({ method, state, data: { page_size: pageSize, page } });

    const fillGameSeries = async (page) => {
      const gameSeriesBunch = await fetch(uri, fetchData(page));

      if (page === 1) {
        dispatch({ type: GAME_EDIT_GAMESERIES_FILL_STARTED });
      }

      dispatch({
        type: GAME_EDIT_GAMESERIES_FILL,
        data: gameSeriesBunch,
      });

      return gameSeriesBunch.count;
    };

    const count = await fillGameSeries(1);
    const pagesCount = getPagesCount(count, pageSize);

    if (pagesCount > 1) {
      let page = 2;

      while (page <= pagesCount) {
        await fillGameSeries(page);
        page += 1;
      }
    }
  };
}

function addGameSeries() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/game-series`;
    const dataList = prepareAddObjectsData(state.gameEdit.gameSeries);

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
            dispatch(setGameSeriesFieldError(dataList[data], error));
          } else {
            dispatch(setGameSeriesField404(dataList[data]));
          }

          throw error;
        });
      }
    }
  };
}

function removeGameSeries() {
  return async (dispatch, getState) => {
    const state = getState();
    const dataList = prepareUpdateObjectsData(state.gameEdit.gameSeries);

    for (const data in dataList) {
      if (has(dataList, data)) {
        /* eslint-disable no-await-in-loop */
        const { deleted } = state.gameEdit.gameSeries;
        if (deleted.includes(dataList[data].id)) {
          console.log('DELETE', dataList[data].slug);

          await fetch(`/api/games/${denormalizeGame(state).slug}/game-series/${dataList[data].id}`, {
            method: 'delete',
            state,
          }).catch((error) => {
            dispatch(setGameSeriesField404(dataList[data]));
          });
        }
      }
    }
  };
}

export function updateGameGameSeriesData() {
  return async (dispatch, getState) => {
    await Promise.all([dispatch(addGameSeries()), dispatch(removeGameSeries())]).then(() => {
      const game = denormalizeGame(getState());

      dispatch(loadAllGameSeries(game.slug));
    });
  };
}
