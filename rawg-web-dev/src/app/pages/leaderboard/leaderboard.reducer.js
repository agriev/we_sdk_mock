import { combineReducers } from 'redux';

import pick from 'ramda/src/pick';

import createReducer from 'tools/redux/create-reducer';
import getCurrentYear from 'tools/dates/current-year';
import getCurrentMonth from 'tools/dates/current-month';

import paginate from 'redux-logic/reducer-creators/paginate';

import { LEADERBOARD_USERS } from './leaderboard.actions';

export const initialState = {
  users: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
    loaded: false,
  },
};

const leaderboardReducer = combineReducers({
  meta: createReducer(
    {
      year: getCurrentYear(),
      month: getCurrentMonth(),
      earliest_year: getCurrentYear(),
      earliest_month: getCurrentMonth(),
    },
    {
      [LEADERBOARD_USERS.success]: (state, data) => {
        return pick(['year', 'month', 'earliest_year', 'earliest_month'], data);
      },
    },
  ),
  users: paginate({
    types: LEADERBOARD_USERS.array,
  }),
});

export default leaderboardReducer;
