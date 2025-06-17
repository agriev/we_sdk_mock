import evolve from 'ramda/src/evolve';
import T from 'ramda/src/T';
import F from 'ramda/src/F';
import pipe from 'ramda/src/pipe';

import createReducer from 'tools/redux/create-reducer';

import adjustByProp from 'tools/ramda/adjust-by-property';
import { toPluralType } from 'tools/urls/entity-from-url';

import {
  DISCOVER_FOLLOW_START,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

import { BROWSE_LISTING_LOAD, BROWSE_LISTING_LOAD_SUCCESS } from './browse-listing.actions';

const emptyListingState = {
  results: [],
  seo_h1: '',
  description: '',
};

const initialState = {
  categories: emptyListingState,
  creators: emptyListingState,
  developers: emptyListingState,
  publishers: emptyListingState,
  genres: emptyListingState,
  tags: emptyListingState,
  platforms: emptyListingState,
  stores: emptyListingState,
  loading: false,
};

// updateListingResults :: (Boolean, Array Object, Array Object) -> Array Object
const updateListingResults = (push, stateResults, actionResults) =>
  (push && stateResults ? stateResults : []).concat(actionResults);

// handleListingUpdate :: (Object, Array Object, Boolean) -> Object
const handleListingUpdate = (actionData, stateListingResults, push) => ({
  ...actionData,
  results: updateListingResults(push, stateListingResults, actionData.results),
});

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
      [toPluralType(item.instance)]: {
        results: adjustByProp('id', item.id, onFollowToggleStartAdjuster),
      },
    },
    state,
  );

const onFollowFinish = (final) => (state, { item }) =>
  evolve(
    {
      [toPluralType(item.instance)]: {
        results: adjustByProp('id', item.id, onFollowFinishAdjuster(final)),
      },
    },
    state,
  );

const browseListing = createReducer(initialState, {
  [BROWSE_LISTING_LOAD]: (state) => ({
    ...state,
    loading: true,
  }),
  [BROWSE_LISTING_LOAD_SUCCESS]: (state, { listing, listingType, push }) => ({
    ...state,
    [listingType]: handleListingUpdate(listing, state[listingType].results, push),
    loading: false,
  }),
  [DISCOVER_FOLLOW_START]: onFollowToggleStart,
  [DISCOVER_UNFOLLOW_START]: onFollowToggleStart,
  [DISCOVER_FOLLOW_SUCCESS]: onFollowFinish(T),
  [DISCOVER_FOLLOW_FAILED]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_SUCCESS]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_FAILED]: onFollowFinish(T),
});

export default browseListing;
