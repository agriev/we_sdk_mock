import { combineReducers } from 'redux';

import isBoolean from 'lodash/isBoolean';

import T from 'ramda/src/T';
import F from 'ramda/src/F';

import createReducer from 'tools/redux/create-reducer';

import paginate from 'redux-logic/reducer-creators/paginate';

import {
  CATALOG_LOAD,
  CATALOG_LOAD_SUCCESS,
  CATALOG_GAMES_LOAD,
  CATALOG_GAMES_LOAD_SUCCESS,
  MAIN_PLATFORMS,
} from './games.actions';

export const initialState = {
  platforms: [],
  ratings: [],
  years: [],
  games: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
    noindex: false,
    nofollow_collections: [],
  },
  loading: false,
};

const games = combineReducers({
  loading: createReducer(false, {
    [CATALOG_LOAD]: T,
    [CATALOG_LOAD_SUCCESS]: F,
  }),
  platforms: createReducer([], {
    [CATALOG_LOAD_SUCCESS]: (state, data) => [...data.platforms],
  }),
  mainPlatforms: paginate({ types: MAIN_PLATFORMS.array }),
  years: createReducer([], {
    [CATALOG_LOAD_SUCCESS]: (state, data) => [...data.years],
  }),
  games: createReducer(
    {
      count: 0,
      next: 1,
      results: [],
      loading: false,
      noindex: false,
      nofollow_collections: [],
    },
    {
      [CATALOG_GAMES_LOAD]: (state, { page }) => ({
        ...state,
        // results: action.data.page === 1 ? [] : state.results,
        loading: true,
        loaded: page === 1 ? false : state.loaded,
      }),
      [CATALOG_GAMES_LOAD_SUCCESS]: (state, data, action) => ({
        ...state,
        ...data,
        results: action.push ? [...state.results, ...data.results.result] : [...data.results.result],
        filters: data.filters,
        loading: false,
        loaded: true,
      }),
    },
  ),
  showOnlyMyPlatformsSSR: createReducer(null, {
    /* eslint-disable camelcase */
    [CATALOG_GAMES_LOAD_SUCCESS]: (state, { user_platforms } = {}) => {
      if (isBoolean(user_platforms)) {
        return user_platforms;
      }

      return state;
    },
  }),
});

export default games;
