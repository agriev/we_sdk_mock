import fetchWithCache from 'tools/fetch-with-cache';

export const BROWSE_SHOWCASE_LOAD = 'BROWSE_SHOWCASE_LOAD';
export const BROWSE_SHOWCASE_LOAD_SUCCESS = 'BROWSE_SHOWCASE_LOAD_SUCCESS';

const fetchShowcaseCached = fetchWithCache(60);

export function loadBrowseShowcase() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/browse?short=true';

    dispatch({ type: BROWSE_SHOWCASE_LOAD });

    return fetchShowcaseCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: BROWSE_SHOWCASE_LOAD_SUCCESS,
        data: {
          items: res.results,
        },
      });
    });
  };
}

export const BROWSE_FULL_LOAD = 'BROWSE_FULL_LOAD';
export const BROWSE_FULL_LOAD_SUCCESS = 'BROWSE_FULL_LOAD_SUCCESS';

const fetchFullCached = fetchWithCache(60);

export function loadBrowseFull() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/browse?short=false';

    dispatch({ type: BROWSE_FULL_LOAD });

    return fetchFullCached(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: BROWSE_FULL_LOAD_SUCCESS,
        data: {
          items: res.results,
        },
      });
    });
  };
}
