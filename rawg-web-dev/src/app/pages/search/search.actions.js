import urlParse from 'url-parse';
import { normalize } from 'normalizr';

import fetch from 'tools/fetch';

import Schemas from 'redux-logic/schemas';

export const SEARCH_ALL_LOAD = 'SEARCH_ALL_LOAD';
export const SEARCH_ALL_LOAD_SUCCESS = 'SEARCH_ALL_LOAD_SUCCESS';
export const SEARCH_ALL_COLLECTIONS_LOAD = 'SEARCH_ALL_COLLECTIONS_LOAD';
export const SEARCH_ALL_COLLECTIONS_LOAD_SUCCESS = 'SEARCH_ALL_COLLECTIONS_LOAD_SUCCESS';
export const SEARCH_ALL_PERSONS_LOAD = 'SEARCH_ALL_PERSONS_LOAD';
export const SEARCH_ALL_PERSONS_LOAD_SUCCESS = 'SEARCH_ALL_PERSONS_LOAD_SUCCESS';
export const SEARCH_ALL_USERS_LOAD = 'SEARCH_ALL_USERS_LOAD';
export const SEARCH_ALL_USERS_LOAD_SUCCESS = 'SEARCH_ALL_USERS_LOAD_SUCCESS';
export const SEARCH_PERSONAL_LOAD = 'SEARCH_PERSONAL_LOAD';
export const SEARCH_PERSONAL_LOAD_SUCCESS = 'SEARCH_PERSONAL_LOAD_SUCCESS';
export const SEARCH_CHANGE_TAB = 'SEARCH_CHANGE_TAB';
export const SEARCH_CURRENT_DATA = 'SEARCH_CURRENT_DATA';

export function findAllGames(search = '', next, { excludeAdditions } = {}) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: SEARCH_ALL_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/games?page_size=20';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        page: next,
        exclude_additions: excludeAdditions ? 'true' : undefined,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);
      const items = normalize(res.results, Schemas.GAME_ARRAY);

      dispatch({
        type: SEARCH_ALL_LOAD_SUCCESS,
        data: {
          ...res,
          results: items,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function findAllCollections(search = '', next) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: SEARCH_ALL_COLLECTIONS_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/collections?page_size=20';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: SEARCH_ALL_COLLECTIONS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function findAllPersons(search = '', next) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: SEARCH_ALL_PERSONS_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/creators?page_size=20';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: SEARCH_ALL_PERSONS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function findAllUsers(search = '', next) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: SEARCH_ALL_USERS_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/users?page_size=20';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: SEARCH_ALL_USERS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function findPersonalGames(search = '', next) {
  return async (dispatch, getState) => {
    const state = getState();

    // Если пользователь неавторизован, то не ищем его игры
    if (!state.currentUser.id) {
      return new Promise((resolve) => {
        resolve();
      });
    }

    if (!search) {
      dispatch({
        type: SEARCH_PERSONAL_LOAD_SUCCESS,
        data: {
          count: 0,
          results: [],
          next: null,
        },
        push: false,
      });

      return new Promise((resolve) => {
        resolve();
      });
    }

    dispatch({
      type: SEARCH_PERSONAL_LOAD,
      data: {
        page: next,
      },
    });

    const uri = '/api/users/current/games?page_size=20';

    return fetch(uri, {
      method: 'get',
      data: {
        search,
        page: next,
      },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);
      const items = normalize(res.results, Schemas.GAME_ARRAY);

      dispatch({
        type: SEARCH_PERSONAL_LOAD_SUCCESS,
        data: {
          ...res,
          results: items,
          next: (url && +url.query.page) || null,
        },
        push: next > 1,
      });
    });
  };
}

export function changeTab(currentTab = 'games') {
  return async (dispatch) => {
    dispatch({
      type: SEARCH_CHANGE_TAB,
      data: currentTab,
    });
  };
}

export function getCurrentData(currentTab = 'games') {
  return async (dispatch, getState) => {
    const state = getState();
    const currentData = (() => {
      switch (currentTab) {
        case 'games':
          return state.search.allGames;
        case 'library':
          return state.search.personalGames;
        case 'collections':
          return state.search.allCollections;
        case 'persons':
          return state.search.allPersons;
        case 'users':
          return state.search.allUsers;
        default:
          return state.search.allGames;
      }
    })();
    dispatch({
      type: SEARCH_CURRENT_DATA,
      data: currentData,
    });
  };
}
