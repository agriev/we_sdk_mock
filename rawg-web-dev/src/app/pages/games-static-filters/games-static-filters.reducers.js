import evolve from 'ramda/src/evolve';
import pipe from 'ramda/src/pipe';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import { combineReducers } from 'redux';

import entities from 'redux-logic/reducer-creators/entities';

import {
  PUBLISHER_LOAD_START,
  PUBLISHER_LOAD_SUCCESS,
  PUBLISHER_LOAD_FAILED,
  DEVELOPER_LOAD_START,
  DEVELOPER_LOAD_SUCCESS,
  DEVELOPER_LOAD_FAILED,
  TAG_LOAD_START,
  TAG_LOAD_SUCCESS,
  TAG_LOAD_FAILED,
  CATEGORY_LOAD_START,
  CATEGORY_LOAD_SUCCESS,
  CATEGORY_LOAD_FAILED,
  PLATFORM_LOAD_START,
  PLATFORM_LOAD_SUCCESS,
  PLATFORM_LOAD_FAILED,
  GENRE_LOAD_START,
  GENRE_LOAD_SUCCESS,
  GENRE_LOAD_FAILED,
  STORE_LOAD_START,
  STORE_LOAD_SUCCESS,
  STORE_LOAD_FAILED,
} from 'app/pages/games-static-filters/games-static-filters.actions';

import {
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_FOLLOW_START,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

const entityInitialState = {
  id: undefined,
  name: '',
  slug: '',
  games_count: 0,
  image_background: '',
  description: '',
  seo_title: '',
  seo_description: '',
  seo_h1: '',
};

const onFollowToggleStart = (instance) => (state, { item }) => {
  if (instance !== item.instance) {
    return state;
  }

  return evolve(
    {
      [item.slug]: pipe(
        addKeyIfNotExists('followLoading', false),
        addKeyIfNotExists('following', false),
        evolve({
          followLoading: T,
        }),
      ),
    },
    state,
  );
};

const onFollowFinish = (instance, final) => (state, { item }) => {
  if (instance !== item.instance) {
    return state;
  }

  return evolve(
    {
      [item.slug]: {
        followLoading: F,
        following: final,
      },
    },
    state,
  );
};

const followHandlers = (instance) => ({
  [DISCOVER_FOLLOW_START]: onFollowToggleStart(instance),
  [DISCOVER_FOLLOW_SUCCESS]: onFollowFinish(instance, T),
  [DISCOVER_FOLLOW_FAILED]: onFollowFinish(instance, F),
  [DISCOVER_UNFOLLOW_START]: onFollowToggleStart(instance),
  [DISCOVER_UNFOLLOW_SUCCESS]: onFollowFinish(instance, F),
  [DISCOVER_UNFOLLOW_FAILED]: onFollowFinish(instance, T),
});

const staticFiltersReducer = combineReducers({
  publishers: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [PUBLISHER_LOAD_START, PUBLISHER_LOAD_SUCCESS, PUBLISHER_LOAD_FAILED],
    additionalHandlers: followHandlers('publisher'),
  }),
  developers: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [DEVELOPER_LOAD_START, DEVELOPER_LOAD_SUCCESS, DEVELOPER_LOAD_FAILED],
    additionalHandlers: followHandlers('developer'),
  }),
  tags: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [TAG_LOAD_START, TAG_LOAD_SUCCESS, TAG_LOAD_FAILED],
    additionalHandlers: followHandlers('tag'),
  }),
  categories: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [CATEGORY_LOAD_START, CATEGORY_LOAD_SUCCESS, CATEGORY_LOAD_FAILED],
    additionalHandlers: followHandlers('category'),
  }),
  platforms: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [PLATFORM_LOAD_START, PLATFORM_LOAD_SUCCESS, PLATFORM_LOAD_FAILED],
    additionalHandlers: followHandlers('platform'),
  }),
  genres: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [GENRE_LOAD_START, GENRE_LOAD_SUCCESS, GENRE_LOAD_FAILED],
    additionalHandlers: followHandlers('genre'),
  }),
  stores: entities({
    initialState: entityInitialState,
    mapActionToKey: (action) => action.id,
    types: [STORE_LOAD_START, STORE_LOAD_SUCCESS, STORE_LOAD_FAILED],
    additionalHandlers: followHandlers('store'),
  }),
});

export default staticFiltersReducer;
