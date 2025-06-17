/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';
import denormalizeGame from 'tools/redux/denormalize-game';

import { addNotification } from 'app/pages/app/components/notifications/notifications.actions';

import { prepareTagsData } from 'app/pages/game-edit/game-edit.helper';

import {
  getPropertiesOfSuccessNotification,
  getPropertiesOfErrorNotification,
} from 'app/pages/game-edit/actions/common';

export const GAME_EDIT_TAGS_FILL = 'GAME_EDIT_TAGS_FILL';
export const GAME_EDIT_TAGS_UPDATE_START = 'GAME_EDIT_TAGS_UPDATE_START';
export const GAME_EDIT_TAGS_UPDATE_FINISH = 'GAME_EDIT_TAGS_UPDATE_FINISH';

export const SEARCH_TAGS_STARTED = 'SEARCH_TAGS_STARTED';
export const SEARCH_TAGS_FINISHED = 'SEARCH_TAGS_FINISHED';

export function fillEditGameTags(tags) {
  return {
    type: GAME_EDIT_TAGS_FILL,
    data: {
      tags,
    },
  };
}

function loadUpdatedTags(dispatch, tags) {
  dispatch(fillEditGameTags(tags));
}

export function updateGameTagsData() {
  return async (dispatch, getState) => {
    dispatch({ type: GAME_EDIT_TAGS_UPDATE_START });

    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}`;
    const tags = prepareTagsData(state.gameEdit.tags);

    await fetch(uri, {
      method: 'patch',
      state,
      data: { tags },
    })
      .then((res) => {
        loadUpdatedTags(dispatch, res.tags);
        dispatch({ type: GAME_EDIT_TAGS_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfSuccessNotification()));
      })
      .catch((error) => {
        dispatch({ type: GAME_EDIT_TAGS_UPDATE_FINISH });
        dispatch(addNotification(getPropertiesOfErrorNotification(error)));
      });
  };
}

export function searchTags(value) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/tags?search=${value}`;

    dispatch({ type: SEARCH_TAGS_STARTED });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: SEARCH_TAGS_FINISHED,
        data: {
          value,
          items: res.results,
        },
      });
    });
  };
}
