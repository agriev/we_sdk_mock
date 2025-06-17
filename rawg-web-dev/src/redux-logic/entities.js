import merge from 'lodash/merge';
import { combineReducers } from 'redux';

import createReducer from 'tools/redux/create-reducer';

import { gamesReducerHandlers } from 'redux-logic/reducers/games';
import discoverSearchReducer from 'app/pages/discover/reducers/discover-search';
import discoverFollowingsReducer from 'app/pages/discover/reducers/discover-followings';

export const UPDATE_ENTITIES = 'UPDATE_ENTITIES';

const initialState = {
  games: {},
  platforms: {},
  parentPlatforms: {},
  suggestions: {},
  collectionFeed: {},
  communityFeed: {},
  notificationFeed: {},
  discoverSearch: {},
  discoverFollowings: {},
  reviews: {},
  mainPlatforms: {},
};

const reducer = combineReducers({
  games: createReducer({}, gamesReducerHandlers((slug) => `g-${slug}`)),
  platforms: createReducer({}, {}),
  parentPlatforms: createReducer({}, {}),
  persons: createReducer({}, {}),
  suggestions: createReducer({}, {}),
  collectionFeed: createReducer({}, {}),
  communityFeed: createReducer({}, {}),
  notificationFeed: createReducer({}, {}),
  reviews: createReducer({}, {}),
  mainPlatforms: createReducer({}, {}),
  discoverSearch: createReducer(
    {},
    {
      ...gamesReducerHandlers((slug) => `game-${slug}`),
      ...discoverSearchReducer,
    },
  ),
  discoverFollowings: createReducer({}, discoverFollowingsReducer),
});

const entitiesReducer = (state = initialState, action) => {
  if (action.data && action.data.results && action.data.results.entities) {
    return merge({}, state, action.data.results.entities);
  }

  return reducer(state, action);
};

export default entitiesReducer;
