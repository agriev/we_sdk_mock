import { combineReducers } from 'redux';

import paginate from 'redux-logic/reducer-creators/paginate';

import { SITEMAP_LOAD } from './sitemap.actions';

export const initialState = {
  letters: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
    loaded: false,
  },
};

const leaderboardReducer = combineReducers({
  letters: paginate({
    mapActionToKey: (action) => action.id,
    types: SITEMAP_LOAD.array,
  }),
});

export default leaderboardReducer;
