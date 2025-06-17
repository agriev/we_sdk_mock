import urlParse from 'url-parse';

import isFunction from 'lodash/isFunction';

import fetch from 'tools/fetch';
import fetchWithCache from 'tools/fetch-with-cache';
import { normalize } from 'normalizr';
import Schemas from 'redux-logic/schemas';
import getLoadingConsts from 'tools/redux/get-loading-consts';
import paginatedAction from 'redux-logic/action-creators/paginated-action';
import { setPage } from '../../../tools/urls/url-modificators';

export const CATALOG_LOAD = 'CATALOG_LOAD';
export const CATALOG_LOAD_SUCCESS = 'CATALOG_LOAD_SUCCESS';
export const CATALOG_GAMES_LOAD = 'CATALOG_GAMES_LOAD';
export const CATALOG_GAMES_LOAD_SUCCESS = 'CATALOG_GAMES_LOAD_SUCCESS';

export const MAIN_PLATFORMS = getLoadingConsts('MAIN_PLATFORMS');

export const PAGE_SIZE = 40;

export const getGamesPageSize = ({ currentUser }) => {
  // Во имя seo мы отдаём гостям более жирные пачки данных на одной странице
  return currentUser.id ? 20 : 40;
};

const fetchPlatformsCached = fetchWithCache();
const fetchYearsCached = fetchWithCache();

export const loadMainPlatforms = paginatedAction({
  pageSize: 40,
  endpoint: '/api/games/lists/main/platforms/parents',
  dataPath: 'games.mainPlatforms',
  types: MAIN_PLATFORMS.array,
  schema: Schemas.MAIN_PLATFORMS_ARRAY,
  reload: false,
});

export function loadCatalog() {
  return async (dispatch, getState) => {
    const state = getState();

    const platformsUri = '/api/platforms/parents';
    const yearsUri = '/api/games/filters/years';

    if (state.games.platforms.length > 0 && state.games.years.length > 0) {
      // Если данные уже загружены - то не делаем повторной загрузки
      return undefined;
    }

    dispatch({
      type: CATALOG_LOAD,
    });

    const [platforms, years] = await Promise.all([
      fetchPlatformsCached(platformsUri, {
        method: 'get',
        state,
      }),

      fetchYearsCached(yearsUri, {
        method: 'get',
        state,
      }),
    ]);

    return dispatch({
      type: CATALOG_LOAD_SUCCESS,
      data: {
        platforms: platforms.results,
        years: years.results,
      },
    });
  };
}

export function loadCatalogGames({ page = 1, filter = {}, pageSize: pageSizeArg = getGamesPageSize } = {}) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games';
    const pageSize = isFunction(pageSizeArg) ? pageSizeArg(state) : pageSizeArg;

    dispatch({
      type: CATALOG_GAMES_LOAD,
      data: {
        page,
      },
    });

    const res = await fetch(uri, {
      method: 'get',
      data: {
        ...filter,
        page,
        page_size: pageSize,
        filter: 'true',
        comments: 'true',
      },
      state,
    });

    const path = typeof window === 'undefined' ? state.app.request.path : window.location.pathname;

    if (path === '/games' && page < 2 && (!filter.ordering || filter.ordering === '-added')) {
      const promo = await fetch('/api/games?promo=promo', {
        state,
      });

      res.results = [...promo.results, ...res.results];
    }

    const nextUrl = res.next && urlParse(res.next, true);
    const results = normalize(res.results, Schemas.GAME_ARRAY);

    setPage(page);

    dispatch({
      type: CATALOG_GAMES_LOAD_SUCCESS,
      data: {
        ...res,
        results,
        next: (nextUrl && +nextUrl.query.page) || null,
      },
      push: page > 1,
    });
  };
}
