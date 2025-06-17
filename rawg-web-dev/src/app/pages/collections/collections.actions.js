import fetch from 'tools/fetch';

export const COLLECTIONS_POPULAR_LOAD = 'COLLECTIONS_POPULAR_LOAD';
export const COLLECTIONS_POPULAR_LOAD_SUCCESS = 'COLLECTIONS_POPULAR_LOAD_SUCCESS';
export const COLLECTIONS_ALL_LOAD = 'COLLECTIONS_ALL_LOAD';
export const COLLECTIONS_ALL_LOAD_SUCCESS = 'COLLECTIONS_ALL_LOAD_SUCCESS';

export const PAGE_SIZE = 20;

export function loadPopularCollections(page = 1, collectionPageSize = PAGE_SIZE) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/lists/popular?page=${page}&page_size=${collectionPageSize}`;

    dispatch({
      type: COLLECTIONS_POPULAR_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: COLLECTIONS_POPULAR_LOAD_SUCCESS,
        data: {
          ...res,
          next: res.next ? page + 1 : null,
          previous: res.previous ? page - 1 : null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadAllCollections(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections?page=${page}&page_size=${PAGE_SIZE}`;

    dispatch({
      type: COLLECTIONS_ALL_LOAD,
    });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: COLLECTIONS_ALL_LOAD_SUCCESS,
        data: {
          ...res,
          next: res.next ? page + 1 : null,
          previous: res.previous ? page - 1 : null,
        },
        push: page > 1,
      });
    });
  };
}
