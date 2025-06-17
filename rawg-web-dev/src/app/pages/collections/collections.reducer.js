import evolve from 'ramda/src/evolve';
import always from 'ramda/src/always';
import concat from 'ramda/src/concat';
import __ from 'ramda/src/__';
import T from 'ramda/src/T';
import F from 'ramda/src/F';
import pipe from 'ramda/src/pipe';

import createReducer from 'tools/redux/create-reducer';
import {
  COLLECTIONS_POPULAR_LOAD,
  COLLECTIONS_POPULAR_LOAD_SUCCESS,
  COLLECTIONS_ALL_LOAD,
  COLLECTIONS_ALL_LOAD_SUCCESS,
} from 'app/pages/collections/collections.actions';

import {
  DISCOVER_FOLLOW_START,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import adjustByProp from 'tools/ramda/adjust-by-property';
import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

const onFollowToggleStartAdjuster = pipe(
  addKeyIfNotExists('followLoading', true),
  addKeyIfNotExists('following', false),
  evolve({
    followLoading: T,
  }),
);

const onFollowFinishAdjuster = (final) =>
  evolve({
    followLoading: F,
    following: final,
  });

const onFollowToggleStart = (state, { item }) =>
  evolve(
    {
      popular: {
        results: adjustByProp('id', item.id, onFollowToggleStartAdjuster),
      },
      all: {
        results: adjustByProp('id', item.id, onFollowToggleStartAdjuster),
      },
    },
    state,
  );

const onFollowFinish = (final) => (state, { item }) =>
  evolve(
    {
      popular: {
        results: adjustByProp('id', item.id, onFollowFinishAdjuster(final)),
      },
      all: {
        results: adjustByProp('id', item.id, onFollowFinishAdjuster(final)),
      },
    },
    state,
  );

const initialState = {
  popular: {
    count: 0,
    previous: null,
    next: null,
    results: [],
    loading: false,
  },
  all: {
    count: 0,
    previous: null,
    next: null,
    results: [],
    loading: false,
  },
};

const collections = createReducer(initialState, {
  [COLLECTIONS_POPULAR_LOAD]: evolve({
    popular: evolve({
      loading: T,
    }),
  }),

  [COLLECTIONS_POPULAR_LOAD_SUCCESS]: (state, { results, count, next, previous }, { push }) =>
    evolve(
      {
        popular: evolve({
          loading: F,
          results: push ? concat(__, results) : always(results),
          count: always(count),
          next: always(next),
          previous: always(previous),
        }),
      },
      state,
    ),

  [COLLECTIONS_ALL_LOAD]: evolve({
    all: evolve({
      loading: T,
    }),
  }),

  [COLLECTIONS_ALL_LOAD_SUCCESS]: (state, { results, count, next, previous }, { push }) =>
    evolve(
      {
        all: evolve({
          loading: F,
          results: push ? concat(__, results) : always(results),
          count: always(count),
          next: always(next),
          previous: always(previous),
        }),
      },
      state,
    ),

  [DISCOVER_FOLLOW_START]: onFollowToggleStart,
  [DISCOVER_UNFOLLOW_START]: onFollowToggleStart,
  [DISCOVER_FOLLOW_SUCCESS]: onFollowFinish(T),
  [DISCOVER_FOLLOW_FAILED]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_SUCCESS]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_FAILED]: onFollowFinish(T),
});

export default collections;
