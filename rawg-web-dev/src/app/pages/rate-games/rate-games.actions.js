import fetch from 'tools/fetch';

import { getRatedGames, clearRatedGames } from 'app/pages/rate-games/rate-games.helper';

export const RATE_GAMES_TOP_LOAD = 'RATE_GAMES_TOP_LOAD';
export const RATE_GAMES_TOP_LOAD_SUCCESS = 'RATE_GAMES_TOP_LOAD_SUCCESS';
export const RATE_GAMES_TOP_REMOVE = 'RATE_GAMES_TOP_REMOVE';

export function loadTopGames() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/reviews/carousel/top100';

    dispatch({
      type: RATE_GAMES_TOP_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: RATE_GAMES_TOP_LOAD_SUCCESS,
        data: {
          ...res,
          count: state.currentUser.id ? res.count : res.count - getRatedGames().length,
        },
      });
    });
  };
}

export function removeRatedGame(removedIndex) {
  return async (dispatch) => {
    dispatch({
      type: RATE_GAMES_TOP_REMOVE,
      data: { removedIndex },
    });
  };
}

export function sendRatedGames() {
  return async (dispatch, getState) => {
    const state = getState();
    const ratedGames = getRatedGames();

    if (ratedGames.length === 0 || !state.app.token) {
      return;
    }

    // eslint-disable-next-line camelcase
    const games = ratedGames.map((rate) => ({
      game: rate.id,
      rating: rate.rating,
    }));

    await fetch('/api/reviews', {
      state,
      method: 'post',
      data: {
        add_to_library: true,
        games,
      },
    });

    clearRatedGames();
  };
}
