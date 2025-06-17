import remove from 'ramda/src/remove';

import { RATE_GAMES_TOP_LOAD, RATE_GAMES_TOP_LOAD_SUCCESS, RATE_GAMES_TOP_REMOVE } from './rate-games.actions';

const initialState = {
  results: [],
  count: 0,
  total_games: 0,
  loading: false,
};

export default function rateGames(state = initialState, action) {
  switch (action.type) {
    case RATE_GAMES_TOP_LOAD:
      return {
        ...state,
        loading: true,
      };

    case RATE_GAMES_TOP_LOAD_SUCCESS:
      return {
        ...action.data,
        loading: false,
      };

    case RATE_GAMES_TOP_REMOVE:
      return {
        ...state,
        count: state.count - 1,
        results: remove(action.data.removedIndex, 1, state.results),
      };

    default:
      return state;
  }
}
