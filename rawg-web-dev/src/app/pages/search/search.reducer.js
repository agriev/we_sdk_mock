import {
  SEARCH_ALL_LOAD,
  SEARCH_ALL_LOAD_SUCCESS,
  SEARCH_ALL_COLLECTIONS_LOAD,
  SEARCH_ALL_COLLECTIONS_LOAD_SUCCESS,
  SEARCH_ALL_PERSONS_LOAD,
  SEARCH_ALL_PERSONS_LOAD_SUCCESS,
  SEARCH_ALL_USERS_LOAD,
  SEARCH_ALL_USERS_LOAD_SUCCESS,
  SEARCH_PERSONAL_LOAD,
  SEARCH_PERSONAL_LOAD_SUCCESS,
  SEARCH_CHANGE_TAB,
  SEARCH_CURRENT_DATA,
} from './search.actions';

export const initialState = {
  tab: 'games',
  allGames: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },

  allCollections: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },

  allPersons: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },

  allUsers: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },

  personalGames: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },
  currentData: {
    count: 0,
    next: null,
    results: [],
    loading: false,
  },
};

export default function search(state = initialState, action) {
  switch (action.type) {
    case SEARCH_CHANGE_TAB:
      return {
        ...state,
        tab: action.data,
      };

    case SEARCH_CURRENT_DATA:
      return {
        ...state,
        currentData: action.data,
      };

    case SEARCH_ALL_LOAD:
      return {
        ...state,
        allGames: {
          ...state.games,
          results: action.data.page === 1 ? [] : state.allGames.results,
          loading: true,
        },
      };

    case SEARCH_ALL_LOAD_SUCCESS:
      return {
        ...state,
        allGames: {
          ...state.allGames,
          ...action.data,
          results: action.push
            ? [...state.allGames.results, ...action.data.results.result]
            : [...action.data.results.result],
          loading: false,
        },
      };

    case SEARCH_ALL_COLLECTIONS_LOAD:
      return {
        ...state,
        allCollections: {
          ...state.collections,
          results: action.data.page === 1 ? [] : state.allCollections.results,
          loading: true,
        },
      };

    case SEARCH_ALL_COLLECTIONS_LOAD_SUCCESS:
      return {
        ...state,
        allCollections: {
          ...state.allCollections,
          ...action.data,
          results: action.push ? [...state.allCollections.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case SEARCH_ALL_PERSONS_LOAD:
      return {
        ...state,
        allPersons: {
          ...state.persons,
          results: action.data.page === 1 ? [] : state.allPersons.results,
          loading: true,
        },
      };

    case SEARCH_ALL_PERSONS_LOAD_SUCCESS:
      return {
        ...state,
        allPersons: {
          ...state.allPersons,
          ...action.data,
          results: action.push ? [...state.allPersons.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };
    case SEARCH_ALL_USERS_LOAD:
      return {
        ...state,
        allUsers: {
          ...state.users,
          results: action.data.page === 1 ? [] : state.allUsers.results,
          loading: true,
        },
      };

    case SEARCH_ALL_USERS_LOAD_SUCCESS:
      return {
        ...state,
        allUsers: {
          ...state.allUsers,
          ...action.data,
          results: action.push ? [...state.allUsers.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case SEARCH_PERSONAL_LOAD:
      return {
        ...state,
        personalGames: {
          ...state.games,
          results: action.data.page === 1 ? [] : state.personalGames.results,
          loading: true,
        },
      };

    case SEARCH_PERSONAL_LOAD_SUCCESS:
      return {
        ...state,
        personalGames: {
          ...state.personalGames,
          ...action.data,
          results: action.push
            ? [...state.personalGames.results, ...action.data.results.result]
            : [...action.data.results.result],
          loading: false,
        },
      };

    default:
      return state;
  }
}
