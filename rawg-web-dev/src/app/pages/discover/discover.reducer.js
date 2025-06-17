import { combineReducers } from 'redux';

import isBoolean from 'lodash/isBoolean';
import isFinite from 'lodash/isFinite';

import evolve from 'ramda/src/evolve';
import always from 'ramda/src/always';
import prepend from 'ramda/src/prepend';
import without from 'ramda/src/without';
import inc from 'ramda/src/inc';
import dec from 'ramda/src/dec';
import prop from 'ramda/src/prop';
import reject from 'ramda/src/reject';
import equals from 'ramda/src/equals';

import createReducer from 'tools/redux/create-reducer';
import paginate from 'redux-logic/reducer-creators/paginate';

import {
  DISCOVER_LOAD_SLIDER,
  DISCOVER_LOAD_GAMES_START,
  DISCOVER_LOAD_GAMES_SUCCESS,
  DISCOVER_LOAD_GAMES_FAILED,
  DISCOVER_SET_DISPLAY_MODE,
  DISCOVER_LOAD_SUGGESTED_GAMES,
  DISCOVER_LOAD_SUGGESTED_GAMES_SUCCESS,
  DISCOVER_LOAD_SUGGESTED_GAMES_FAIL,
  DISCOVER_SEARCH_START,
  DISCOVER_SEARCH_SUCCESS,
  DISCOVER_SEARCH_FAILED,
  DISCOVER_SEARCH_RESET,
  DISCOVER_LOAD_FOLLOWINGS_START,
  DISCOVER_LOAD_FOLLOWINGS_SUCCESS,
  DISCOVER_LOAD_FOLLOWINGS_FAILED,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_LOAD_YEARS_WISHLIST,
  DISCOVER_LOAD_YEARS_LIBRARY,
  DISCOVER_LOAD_YEARS_FRIENDS,
  DISCOVER_HIDE_GAME,
  DISCOVER_LOAD_RECOMMENDED,
  DISCOVER_LOAD_LAST_PLAYED,
} from 'app/pages/discover/discover.actions';

import { MODE_SELECTOR_COLUMNS } from 'app/components/mode-selector/mode-selector.helper';
import { COLLECTION_UNFOLLOW_SUCCESS, COLLECTION_FOLLOW_SUCCESS } from 'app/pages/collection/collection.actions';

const defaultDisplayMode = MODE_SELECTOR_COLUMNS;

const discoverReducer = combineReducers({
  displayMode: createReducer(defaultDisplayMode, {
    [DISCOVER_SET_DISPLAY_MODE]: (state, { mode }) => mode,
  }),
  showOnlyMyPlatformsSSR: createReducer(null, {
    /* eslint-disable camelcase */
    [DISCOVER_LOAD_GAMES_SUCCESS]: (state, { user_platforms } = {}) => {
      if (isBoolean(user_platforms)) {
        return user_platforms;
      }

      return state;
    },
  }),
  games: paginate({
    mapActionToKey: prop('id'),
    types: [DISCOVER_LOAD_GAMES_START, DISCOVER_LOAD_GAMES_SUCCESS, DISCOVER_LOAD_GAMES_FAILED],
    additionalHandlers: {
      [DISCOVER_LOAD_GAMES_SUCCESS]: (state, { recommendations_count }) => {
        if (isFinite(recommendations_count)) {
          return {
            ...state,
            recommendations_count,
          };
        }

        return state;
      },
      [DISCOVER_HIDE_GAME.started]: (state, { slug }) => {
        return evolve(
          {
            main: {
              count: dec,
              items: reject(equals(`g-${slug}`)),
            },
          },
          state,
        );
      },
    },
  }),
  libraryCounters: createReducer(
    {},
    {
      [DISCOVER_LOAD_GAMES_SUCCESS]: (state, { counters }) => {
        if (counters) {
          return counters;
        }

        return state;
      },
    },
  ),
  sectionsYears: combineReducers({
    wishlist: createReducer([], {
      [DISCOVER_LOAD_YEARS_WISHLIST]: (state, data) => data,
    }),
    library: createReducer([], {
      [DISCOVER_LOAD_YEARS_LIBRARY]: (state, data) => data,
    }),
    friends: createReducer([], {
      [DISCOVER_LOAD_YEARS_FRIENDS]: (state, data) => data,
    }),
  }),
  followings: paginate({
    types: [DISCOVER_LOAD_FOLLOWINGS_START, DISCOVER_LOAD_FOLLOWINGS_SUCCESS, DISCOVER_LOAD_FOLLOWINGS_FAILED],
    additionalHandlers: {
      [DISCOVER_FOLLOW_SUCCESS]: (state, { item }) =>
        evolve(
          {
            items: prepend(`${item.instance}-${item.slug}`),
            count: inc,
          },
          state,
        ),

      [DISCOVER_UNFOLLOW_SUCCESS]: (state, { item }) =>
        evolve(
          {
            items: without([`${item.instance}-${item.slug}`]),
            count: dec,
          },
          state,
        ),

      [COLLECTION_FOLLOW_SUCCESS]: (state, { collection }) =>
        evolve(
          {
            items: prepend(`collection-${collection.slug}`),
            count: inc,
          },
          state,
        ),

      [COLLECTION_UNFOLLOW_SUCCESS]: (state, { collection }) =>
        evolve(
          {
            items: without([`collection-${collection.slug}`]),
            count: dec,
          },
          state,
        ),
    },
  }),
  recommended: createReducer([], {
    [DISCOVER_LOAD_RECOMMENDED]: (state, data) => data,
  }),
  lastPlayed: createReducer([], {
    [DISCOVER_LOAD_LAST_PLAYED]: (state, data) => data,
  }),
  search: paginate({
    types: [DISCOVER_SEARCH_START, DISCOVER_SEARCH_SUCCESS, DISCOVER_SEARCH_FAILED],
    additionalHandlers: {
      [DISCOVER_SEARCH_RESET]: evolve({
        items: always([]),
        count: always(0),
        next: always(null),
        loading: always(false),
      }),
    },
  }),
  suggestedGames: paginate({
    mapActionToKey: (action) => `g-${action.id}`,
    types: [DISCOVER_LOAD_SUGGESTED_GAMES, DISCOVER_LOAD_SUGGESTED_GAMES_SUCCESS, DISCOVER_LOAD_SUGGESTED_GAMES_FAIL],
  }),

  slider: createReducer([], {
    [DISCOVER_LOAD_SLIDER]: (state, data) => data,
  }),
});

export default discoverReducer;
