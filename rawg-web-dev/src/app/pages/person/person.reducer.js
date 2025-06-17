import isNull from 'lodash/isNull';
import get from 'lodash/get';

import {
  DISCOVER_FOLLOW_START,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import {
  PERSON_LOAD,
  PERSON_LOAD_SUCCESS,
  PERSON_GAMES_LOAD,
  PERSON_GAMES_LOAD_SUCCESS,
  PERSON_GAMES_KNOWN_FOR_LOAD,
  PERSON_GAMES_KNOWN_FOR_LOAD_SUCCESS,
} from './person.actions';

export const initialState = {
  id: 0,
  name: '',
  slug: '',
  image: '',
  image_background: '',
  description: '',
  games_count: 0,
  reviews_count: 0,
  rating: '',
  rating_top: 0,
  positions: [],
  following: false,
  followLoading: false,
  platforms: {
    results: [],
    count: 0,
    total: 0,
  },
  ratings: [],
  timeline: [],
  games: {
    items: [],
    loading: false,
    next: null,
    previuos: null,
  },
  gamesKnownFor: {
    items: [],
    loading: false,
  },
};

const isCurrentPerson = (action, state) =>
  get(action, 'data.item.instance') === 'person' && get(action, 'data.item.id') === state.id;

export default function person(state = initialState, action) {
  switch (action.type) {
    case PERSON_LOAD:
      return {
        ...initialState,
        loading: true,
      };

    case PERSON_LOAD_SUCCESS:
      return {
        ...state,
        ...action.data,
        loading: false,
      };

    case PERSON_GAMES_LOAD:
      return {
        ...state,
        games: {
          ...state.games,
          loading: true,
          next: null,
          previous: null,
          loaded: parseInt(action.page, 10) === 1 ? false : state.games.loaded,
          items: parseInt(action.page, 10) === 1 ? [] : state.games.items,
          count: parseInt(action.page, 10) === 1 ? 0 : state.games.count,
        },
      };

    case PERSON_GAMES_LOAD_SUCCESS: {
      const { results, count, next, previous } = action.data;
      const getPage = (pageValue) => (isNull(pageValue) ? null : +action.page + 1);

      return {
        ...state,
        games: {
          items: [...state.games.items, ...results.result],
          loading: false,
          loaded: true,
          next: getPage(next),
          previous: getPage(previous),
          count,
        },
      };
    }

    case PERSON_GAMES_KNOWN_FOR_LOAD:
      return {
        ...state,
        gamesKnownFor: {
          ...state.gamesKnownFor,
          loading: true,
        },
      };

    case PERSON_GAMES_KNOWN_FOR_LOAD_SUCCESS:
      return {
        ...state,
        gamesKnownFor: {
          items: action.data.results.result,
          loading: false,
        },
      };

    case DISCOVER_FOLLOW_START: {
      if (isCurrentPerson(action, state)) {
        return {
          ...state,
          following: false,
          followLoading: true,
        };
      }

      return state;
    }

    case DISCOVER_FOLLOW_SUCCESS:
    case DISCOVER_UNFOLLOW_FAILED: {
      if (isCurrentPerson(action, state)) {
        return {
          ...state,
          following: true,
          followLoading: false,
        };
      }

      return state;
    }

    case DISCOVER_FOLLOW_FAILED:
    case DISCOVER_UNFOLLOW_SUCCESS: {
      if (isCurrentPerson(action, state)) {
        return {
          ...state,
          following: false,
          followLoading: false,
        };
      }

      return state;
    }

    case DISCOVER_UNFOLLOW_START: {
      if (isCurrentPerson(action, state)) {
        return {
          ...state,
          following: true,
          followLoading: true,
        };
      }

      return state;
    }

    default:
      return state;
  }
}
