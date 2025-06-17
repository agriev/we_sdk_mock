/* eslint-disable no-nested-ternary */

import { combineReducers } from 'redux';

import createReducer from 'tools/redux/create-reducer';
import paginate from 'redux-logic/reducer-creators/paginate';

import {
  SHOWCASE_IMGUR_LOAD_SUCCESS,
  SHOWCASE_PERSONS_LOAD_SUCCESS,
  SHOWCASE_TWITCH_LOAD_SUCCESS,
  SHOWCASE_POPULAR_LOAD,
  SHOWCASE_POPULAR_LOAD_SUCCESS,
  SHOWCASE_POPULAR_LOAD_FAIL,
  SHOWCASE_MOST_WATCHED_VIDEOS_LOAD_SUCCESS,
  SHOWCASE_TOP_REDDIT_POSTS_LOAD_SUCCESS,
  SHOWCASE_ALL_COLLECTIONS_LOAD,
  SHOWCASE_ALL_COLLECTIONS_LOAD_SUCCESS,
  SHOWCASE_NEWS_LOAD_SUCCESS,
  SHOWCASE_RECENT_CURRENT_START,
  SHOWCASE_RECENT_CURRENT_SUCCESS,
  SHOWCASE_RECENT_CURRENT_FAIL,
  SHOWCASE_RECENT_PAST_START,
  SHOWCASE_RECENT_PAST_SUCCESS,
  SHOWCASE_RECENT_PAST_FAIL,
  SHOWCASE_RECENT_FUTURE_START,
  SHOWCASE_RECENT_FUTURE_SUCCESS,
  SHOWCASE_RECENT_FUTURE_FAIL,
} from './showcase.actions';

const createAssignReducer = (
  actionName,
  initial = {
    results: [],
    count: 0,
  },
) =>
  createReducer(initial, {
    [actionName]: (state, data) => ({ ...state, ...data }),
  });

const initialPaginationState = {
  results: [],
  count: 0,
  next: 1,
  loading: false,
};

const loadReducer = (state, data) => ({
  ...state,
  results: data.page === 1 ? [] : state.results,
  loading: true,
});

const successReducer = (state, data) => ({
  ...state,
  ...data,
  results: [...state.results, ...data.results],
  loading: false,
});

const createPaginationReducer = ([load, success]) =>
  createReducer(initialPaginationState, {
    [load]: loadReducer,
    [success]: successReducer,
  });

const showcase = combineReducers({
  imgur: createAssignReducer(SHOWCASE_IMGUR_LOAD_SUCCESS),
  persons: createAssignReducer(SHOWCASE_PERSONS_LOAD_SUCCESS),
  twitch: createAssignReducer(SHOWCASE_TWITCH_LOAD_SUCCESS),
  mostWatchedVideos: createAssignReducer(SHOWCASE_MOST_WATCHED_VIDEOS_LOAD_SUCCESS),
  topRedditPosts: createAssignReducer(SHOWCASE_TOP_REDDIT_POSTS_LOAD_SUCCESS),
  news: createAssignReducer(SHOWCASE_NEWS_LOAD_SUCCESS, {
    title: '',
    link: '',
    date: '',
  }),
  recent: combineReducers({
    current: paginate({
      types: [SHOWCASE_RECENT_CURRENT_START, SHOWCASE_RECENT_CURRENT_SUCCESS, SHOWCASE_RECENT_CURRENT_FAIL],
    }),
    future: paginate({
      types: [SHOWCASE_RECENT_FUTURE_START, SHOWCASE_RECENT_FUTURE_SUCCESS, SHOWCASE_RECENT_FUTURE_FAIL],
    }),
    past: paginate({
      types: [SHOWCASE_RECENT_PAST_START, SHOWCASE_RECENT_PAST_SUCCESS, SHOWCASE_RECENT_PAST_FAIL],
    }),
  }),

  popular: paginate({
    types: [SHOWCASE_POPULAR_LOAD, SHOWCASE_POPULAR_LOAD_SUCCESS, SHOWCASE_POPULAR_LOAD_FAIL],
  }),

  collections: createPaginationReducer([SHOWCASE_ALL_COLLECTIONS_LOAD, SHOWCASE_ALL_COLLECTIONS_LOAD_SUCCESS]),
});

export default showcase;
