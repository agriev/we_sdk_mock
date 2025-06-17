import evolve from 'ramda/src/evolve';
import T from 'ramda/src/T';
import F from 'ramda/src/F';
import pipe from 'ramda/src/pipe';
import always from 'ramda/src/always';

import createReducer from 'tools/redux/create-reducer';

import adjustByProp from 'tools/ramda/adjust-by-property';
import { toPluralType } from 'tools/urls/entity-from-url';

import {
  BROWSE_SHOWCASE_LOAD,
  BROWSE_SHOWCASE_LOAD_SUCCESS,
  BROWSE_FULL_LOAD,
  BROWSE_FULL_LOAD_SUCCESS,
} from 'app/pages/browse/browse.actions';

import {
  DISCOVER_FOLLOW_START,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

const initialState = {
  showcase: {
    items: [],
    loading: false,
  },
  fullCase: {
    items: [],
    loading: false,
  },
};

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
      fullCase: {
        items: adjustByProp(
          'slug',
          toPluralType(item.instance),
          evolve({
            items: adjustByProp('id', item.id, onFollowToggleStartAdjuster),
          }),
        ),
      },
    },
    state,
  );

const onFollowFinish = (final) => (state, { item }) =>
  evolve(
    {
      fullCase: {
        items: adjustByProp(
          'slug',
          toPluralType(item.instance),
          evolve({
            items: adjustByProp('id', item.id, onFollowFinishAdjuster(final)),
          }),
        ),
      },
    },
    state,
  );

const browse = createReducer(initialState, {
  [BROWSE_SHOWCASE_LOAD]: evolve({
    showcase: evolve({
      loading: T,
    }),
  }),

  [BROWSE_SHOWCASE_LOAD_SUCCESS]: (state, { items }) =>
    evolve(
      {
        showcase: evolve({
          loading: F,
          items: always(items),
        }),
      },
      state,
    ),

  [BROWSE_FULL_LOAD]: evolve({
    fullCase: evolve({
      loading: T,
    }),
  }),

  [BROWSE_FULL_LOAD_SUCCESS]: (state, { items }) =>
    evolve(
      {
        fullCase: evolve({
          loading: F,
          items: always(items),
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

export default browse;
