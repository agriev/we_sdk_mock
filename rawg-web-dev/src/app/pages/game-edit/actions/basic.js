/* eslint-disable import/prefer-default-export */

import { push } from 'react-router-redux';

import fetch from 'tools/fetch';
import dissoc from 'ramda/src/dissoc';
import pick from 'ramda/src/pick';
import denormalizeGame from 'tools/redux/denormalize-game';

import { addNotification } from 'app/pages/app/components/notifications/notifications.actions';

import { sendAnalyticsEdit } from 'scripts/analytics-helper';
import { prepareSubmitData } from 'app/pages/game-edit/game-edit.helper';
import { GAME_LOAD_SUCCESS } from 'app/pages/game/game.actions';
import paths from 'config/paths';
import {
  getPropertiesOfErrorNotification,
  resetFields,
  getPropertiesOfSuccessNotification,
  fillEditGameData,
} from 'app/pages/game-edit/actions/common';

export const GAME_EDIT_SUBMIT_START = 'GAME_EDIT_SUBMIT_START';
export const GAME_EDIT_SUBMIT_FINISH = 'GAME_EDIT_SUBMIT_FINISH';
export const GAME_EDIT_SUBMIT_SUCCESS = 'GAME_EDIT_SUBMIT_MAIN_SUCCESS';
export const GAME_EDIT_SUBMIT_FAIL = 'GAME_EDIT_SUBMIT_MAIN_FAIL';

async function runUpdateInfo({ dispatch, state, data, multipart = false }) {
  const gameData = denormalizeGame(state);
  const uri = gameData.id ? `/api/games/${gameData.slug}` : '/api/games';
  const method = gameData.id ? 'patch' : 'post';

  try {
    const game = await fetch(uri, {
      multipart,
      method,
      data,
      state,
    });

    dispatch({
      type: GAME_EDIT_SUBMIT_SUCCESS,
      data: game,
    });

    return game;
  } catch (error) {
    dispatch({
      type: GAME_EDIT_SUBMIT_FAIL,
      data: error && error.errors,
    });

    dispatch(addNotification(getPropertiesOfErrorNotification(error)));

    return null;
  }
}

export function updateGameInfo() {
  return async (dispatch, getState) => {
    dispatch({ type: GAME_EDIT_SUBMIT_START });

    let state = getState();

    const isNewGame = !denormalizeGame(state).id;
    const withoutImage = dissoc('image');
    const data = prepareSubmitData(state);

    const game1 = await runUpdateInfo({ dispatch, state, data: withoutImage(data) });
    if (game1) {
      if (isNewGame) {
        dispatch({
          type: GAME_LOAD_SUCCESS,
          data: {
            results: game1,
          },
        });
        state = getState();
      }

      if (data.image) {
        const imageData = pick(['image'], data);
        const game2 = await runUpdateInfo({
          dispatch,
          state,
          data: imageData,
          multipart: true,
        });

        if (game2 && !isNewGame) {
          dispatch(fillEditGameData(game2));
        }
      } else if (!isNewGame) {
        dispatch(fillEditGameData(game1));
      }

      if (isNewGame) {
        dispatch(push(paths.game(game1.slug)));
      } else {
        dispatch(resetFields());
        dispatch(addNotification(getPropertiesOfSuccessNotification()));
      }
    }

    dispatch({ type: GAME_EDIT_SUBMIT_FINISH });
    sendAnalyticsEdit('save');
  };
}
