import omit from 'lodash/omit';

import {
  COLLECTION_LOAD,
  COLLECTION_LOAD_SUCCESS,
  COLLECTION_FEED_LOAD,
  COLLECTION_FEED_LOAD_SUCCESS,
  // COLLECTION_SAVE,
  // COLLECTION_SAVE_SUCCESS,
  COLLECTION_SAVE_FAIL,
  COLLECTION_SAVE_SUCCESS,
  COLLECTION_SEARCH_GAMES,
  COLLECTION_SEARCH_GAMES_SUCCESS,
  COLLECTION_CLEAN,
  COLLECTION_FOLLOW_UNFOLLOW,
  COLLECTION_FOLLOW_SUCCESS,
  COLLECTION_UNFOLLOW_SUCCESS,
  COLLECTION_RECOMMENDATIONS_LOAD_SUCCESS,
  COLLECTION_REMOVE_FEED_ITEM,
  COLLECTION_LIKE,
} from './collection.actions';

export const initialState = {
  id: '',
  name: '',
  seo_h1: '',
  slug: '',
  description: '',
  is_private: true,
  following: false,
  follow_loading: false,
  likes_count: 0,
  user_like: 0,
  likes_users: 0,
  creator: {
    id: undefined,
    username: '',
    slug: '',
    full_name: '',
    avatar: undefined,
    games_count: 0,
    collections_count: 0,
    followers_count: 0,
  },
  feed: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
    loaded: false,
  },
  recommendations: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  errors: {},
  loading: false,
};

export default function collection(state = initialState, action) {
  switch (action.type) {
    case COLLECTION_LOAD:
      return {
        ...initialState,
        loading: true,
      };

    case COLLECTION_LOAD_SUCCESS:
      return {
        ...state,
        ...omit(action.data, ['games']),
        loading: false,
      };

    case COLLECTION_FEED_LOAD:
      return {
        ...state,
        feed: {
          ...state.feed,
          loaded: action.data.next > 1 ? state.feed.loaded : false,
          loading: true,
        },
      };

    case COLLECTION_FEED_LOAD_SUCCESS:
      return {
        ...state,
        feed: {
          ...state.feed,
          ...action.data,
          results: action.push
            ? [...state.feed.results, ...action.data.results.result]
            : [...action.data.results.result],
          loading: false,
          loaded: true,
        },
      };

    case COLLECTION_SEARCH_GAMES:
      return {
        ...state,
        search: {
          ...state.search,
          loading: true,
        },
      };

    case COLLECTION_SEARCH_GAMES_SUCCESS:
      return {
        ...state,
        search: {
          ...state.search,
          ...action.data,
          results: action.push ? [...state.search.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case COLLECTION_SAVE_SUCCESS:
      return {
        ...state,
        ...action.data,
        seo_h1: action.data.name,
        errors: {},
      };

    case COLLECTION_SAVE_FAIL:
      return {
        ...state,
        errors: action.data,
      };

    case COLLECTION_CLEAN:
      return {
        ...initialState,
      };

    case COLLECTION_FOLLOW_UNFOLLOW:
      return {
        ...state,
        follow_loading: true,
      };

    case COLLECTION_FOLLOW_SUCCESS:
      return {
        ...state,
        following: true,
        follow_loading: false,
      };

    case COLLECTION_UNFOLLOW_SUCCESS:
      return {
        ...state,
        following: false,
        follow_loading: false,
      };

    case COLLECTION_RECOMMENDATIONS_LOAD_SUCCESS:
      return {
        ...state,
        recommendations: action.data,
      };

    case COLLECTION_REMOVE_FEED_ITEM:
      return {
        ...state,
        feed: {
          ...state.feed,
          results: state.feed.results.filter((item) => item !== action.data.item.id),
        },
      };

    case COLLECTION_LIKE.started:
      return {
        ...state,
        ...action.data,
      };

    default:
      return state;
  }
}
