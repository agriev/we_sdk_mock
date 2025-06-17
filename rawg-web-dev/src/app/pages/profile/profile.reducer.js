/* eslint-disable no-case-declarations, sonarjs/cognitive-complexity, sonarjs/max-switch-cases */
import { combineReducers } from 'redux';

import profileGamesReducer from 'app/pages/profile/profile.reducers/profile.games.reducer';

import createAssignReducer from 'tools/redux/create-assign-reducer';
import paginate from 'redux-logic/reducer-creators/paginate';

import when from 'ramda/src/when';
import remove from 'ramda/src/remove';
import update from 'ramda/src/update';
import reject from 'ramda/src/reject';
import evolve from 'ramda/src/evolve';
import propEq from 'ramda/src/propEq';
import always from 'ramda/src/always';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import {
  PROFILE_LOAD,
  PROFILE_LOAD_SUCCESS,
  PROFILE_STATS_LOAD,
  PROFILE_STATS_LOAD_SUCCESS,
  PROFILE_RECENTLY_GAMES_LOAD,
  PROFILE_RECENTLY_GAMES_LOAD_SUCCESS,
  PROFILE_FAVOURITE_GAMES_LOAD,
  PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS,
  PROFILE_COLLECTIONS_CREATED_LOAD,
  PROFILE_COLLECTIONS_CREATED_LOAD_SUCCESS,
  PROFILE_COLLECTIONS_FOLLOWING_LOAD,
  PROFILE_COLLECTIONS_FOLLOWING_LOAD_SUCCESS,
  PROFILE_CONNECTIONS_FOLLOWERS_LOAD,
  PROFILE_CONNECTIONS_FOLLOWERS_LOAD_SUCCESS,
  PROFILE_FOLLOW_UNFOLLOW_USER,
  PROFILE_FOLLOW_USER_SUCCESS,
  PROFILE_UNFOLLOW_USER_SUCCESS,
  PROFILE_REVIEWS_LOAD,
  PROFILE_REVIEWS_LOAD_SUCCESS,
  PROFILE_REVIEWS_UPDATE_SUCCESS,
  PROFILE_TOP_REVIEWS_LOAD_SUCCESS,
  PROFILE_TOP_PERSONS_LOAD_SUCCESS,
  PROFILE_UNRATED_GAMES_LOAD,
  PROFILE_UNRATED_GAMES_LOAD_SUCCESS,
  PROFILE_REMOVE_RATED_GAME,
  PROFILE_UNLOAD_UNRATED_GAMES,
  PROFILE_PLATFORMS_LOAD,
  PROFILE_PLATFORMS_LOAD_SUCCESS,
  PROFILE_GENRES_LOAD,
  PROFILE_GENRES_LOAD_SUCCESS,
  PROFILE_YEARS_LOAD,
  PROFILE_YEARS_LOAD_SUCCESS,
  PROFILE_FAVOURITE_GAMES_LOAD_FAILED,
  PROFILE_TOP_PERSONS_LOAD,
  PROFILE_TOP_REVIEWS_LOAD,
  PROFILE_RESET_STATE,
  PROFILE_CONNECTIONS_FOLLOWING_LOAD,
  PROFILE_CONNECTIONS_FOLLOWING_LOAD_SUCCESS,
  PROFILE_REMOVE_GAME_FROM_FAVOURITES,
  PROFILE_ADD_GAME_TO_FAVOURITES,
  PROFILE_RECENTLY_GAMES_LOAD_FAILED,
} from './profile.actions';

const profileUserInitialState = {
  id: '',
  username: '',
  full_name: '',
  bio: '',
  avatar: '',
  slug: '',
  games_count: 0,
  is_active: false,
  following: false,
  follow_loading: false,
  platforms: [],
  genres: [],
  years: [],
};

const profileReducer = combineReducers({
  user: createAssignReducer({
    actions: [PROFILE_LOAD, PROFILE_LOAD_SUCCESS],
    initial: profileUserInitialState,
    handlers: {
      [PROFILE_RESET_STATE]: always(profileUserInitialState),
      [PROFILE_FOLLOW_UNFOLLOW_USER]: evolve({
        follow_loading: T,
      }),
      [PROFILE_UNFOLLOW_USER_SUCCESS]: evolve({
        follow_loading: F,
        following: F,
      }),
      [PROFILE_FOLLOW_USER_SUCCESS]: evolve({
        follow_loading: F,
        following: T,
      }),
    },
  }),
  platforms: createAssignReducer({
    actions: [PROFILE_PLATFORMS_LOAD, PROFILE_PLATFORMS_LOAD_SUCCESS],
    initial: [],
  }),
  genres: createAssignReducer({
    actions: [PROFILE_GENRES_LOAD, PROFILE_GENRES_LOAD_SUCCESS],
    initial: [],
  }),
  years: createAssignReducer({
    actions: [PROFILE_YEARS_LOAD, PROFILE_YEARS_LOAD_SUCCESS],
    initial: [],
  }),
  games: profileGamesReducer,
  recentlyGames: paginate({
    types: [PROFILE_RECENTLY_GAMES_LOAD, PROFILE_RECENTLY_GAMES_LOAD_SUCCESS, PROFILE_RECENTLY_GAMES_LOAD_FAILED],
  }),
  favouriteGames: paginate({
    mapActionToKey: (action) => action.id,
    unionResults: false,
    types: [PROFILE_FAVOURITE_GAMES_LOAD, PROFILE_FAVOURITE_GAMES_LOAD_SUCCESS, PROFILE_FAVOURITE_GAMES_LOAD_FAILED],
    additionalHandlers: {
      [PROFILE_REMOVE_GAME_FROM_FAVOURITES]: (state, data) =>
        evolve(
          {
            [data.userSlug]: {
              items: update(data.position, null),
            },
          },
          state,
        ),
      [PROFILE_ADD_GAME_TO_FAVOURITES]: (state, data) =>
        evolve(
          {
            [data.userSlug]: {
              items: update(data.position, `g-${data.game.slug}`),
            },
          },
          state,
        ),
    },
  }),
  collectionsCreated: createAssignReducer({
    actions: [PROFILE_COLLECTIONS_CREATED_LOAD, PROFILE_COLLECTIONS_CREATED_LOAD_SUCCESS],
  }),
  collectionsFollowing: createAssignReducer({
    actions: [PROFILE_COLLECTIONS_FOLLOWING_LOAD, PROFILE_COLLECTIONS_FOLLOWING_LOAD_SUCCESS],
  }),
  connectionsFollowing: createAssignReducer({
    actions: [PROFILE_CONNECTIONS_FOLLOWING_LOAD, PROFILE_CONNECTIONS_FOLLOWING_LOAD_SUCCESS],
  }),
  connectionsFollowers: createAssignReducer({
    actions: [PROFILE_CONNECTIONS_FOLLOWERS_LOAD, PROFILE_CONNECTIONS_FOLLOWERS_LOAD_SUCCESS],
  }),
  topPersons: createAssignReducer({
    actions: [PROFILE_TOP_PERSONS_LOAD, PROFILE_TOP_PERSONS_LOAD_SUCCESS],
  }),
  topReviews: createAssignReducer({
    actions: [PROFILE_TOP_REVIEWS_LOAD, PROFILE_TOP_REVIEWS_LOAD_SUCCESS],
  }),
  reviews: createAssignReducer({
    actions: [PROFILE_REVIEWS_LOAD, PROFILE_REVIEWS_LOAD_SUCCESS],
    initial: {
      count: 0,
      next: 1,
      results: [],
      ratings: {
        count: 0,
        total: 0,
        results: [],
      },
      loading: true,
    },
    handlers: {
      [PROFILE_REVIEWS_UPDATE_SUCCESS]: (state, data) => {
        const { reviews, removedReview } = data;
        const hasRemovedReview = () => !!removedReview;
        const saveResults = when(hasRemovedReview, reject(propEq('id', removedReview.id)));

        return {
          ...state,
          ...reviews,
          next: state.next,
          results: saveResults(state.results),
          loading: false,
        };
      },
    },
  }),
  unratedGames: createAssignReducer({
    actions: [PROFILE_UNRATED_GAMES_LOAD, PROFILE_UNRATED_GAMES_LOAD_SUCCESS],
    initial: {
      count: 0,
      next: 0,
      isNext: false,
      loading: false,
      results: [],
      rated: 0,
    },
    handlers: {
      [PROFILE_REMOVE_RATED_GAME]: (state, data) => ({
        ...state,
        rated: state.rated + 1,
        count: state.count - 1,
        results: remove(data.currentSlide, 1, state.results),
      }),
      [PROFILE_UNLOAD_UNRATED_GAMES]: (state, data) => ({
        ...state,
        results: remove(0, data.count, state.results),
      }),
    },
    finishData: (state, action) => ({
      rated: action.push ? state.rated : 0,
    }),
  }),
  stats: createAssignReducer({
    actions: [PROFILE_STATS_LOAD, PROFILE_STATS_LOAD_SUCCESS],
    initial: {
      reviews: {
        graph: [],
        ratings: [],
        count: 0,
      },
      comments: {
        graph: [],
        top: [],
        count: 0,
      },
      collections: {
        graph: [],
        top: [],
        count: 0,
      },
      games: {
        graph: [],
        statuses: [],
        count: 0,
      },
      genres: {
        count: 0,
        total: 0,
        results: [],
      },
      developers: {
        count: 0,
        total: 0,
        results: [],
      },
      platforms: {
        count: 0,
        total: 0,
        results: [],
      },
      timeline: [],
      years: [],
      loading: true,
    },
  }),
});

export default profileReducer;
