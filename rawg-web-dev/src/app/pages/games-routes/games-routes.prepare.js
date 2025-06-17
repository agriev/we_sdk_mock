import { prepareGameFn } from 'app/pages/game/game.prepare';

import { getStores, getGenres, getPlatforms } from 'app/pages/app/app.actions';

import { getFilterSubcats } from './games-routes.selectors';
import prepareGamesFn from '../games/games.prepare';
import { loadCatalog } from '../games/games.actions';
import {
  prepareFiltersForGames,
  parseFiltersFromPath,
  mergePathAndQueryFilters,
  getSubroutes,
  isGamesRoute,
  getCatalogFiltersFromQuery,
} from './games-routes.lib';

const preloadGamesCatalogData = ({
  store,
  pathFilters,
  query,
  filterSubcats,
  location,
  appSettings,
  currentUser,
  appToken,
}) =>
  prepareGamesFn({
    store,
    location,
    params: {
      filters: prepareFiltersForGames({
        pathFilters,
        queryFilters: query,
        filterSubcats,
        appSettings,
        currentUser,
        appToken,
      }),
    },
  });

const preloadGameData = ({ store, id, location }) =>
  prepareGameFn({
    store,
    params: { id },
    location,
  });

const prepareFn = async ({ store, location }) => {
  const { dispatch, getState } = store;

  await Promise.all([dispatch(loadCatalog()), dispatch(getStores()), dispatch(getGenres()), dispatch(getPlatforms())]);

  const state = getState();
  const { app, games, currentUser } = state;
  const { pathname, query } = location;

  const { platforms, years } = games;
  const { genres, stores } = app;
  const { settings: appSettings, token: appToken } = app;

  const filterSubcats = getFilterSubcats({
    platforms,
    years,
    genres,
    stores,
  });

  const pathFilters = parseFiltersFromPath(pathname, filterSubcats);
  const allFilters = mergePathAndQueryFilters(pathFilters, getCatalogFiltersFromQuery(query));

  const subroutes = getSubroutes(pathname);

  if (subroutes[1] !== 'full' && isGamesRoute(allFilters, subroutes)) {
    return preloadGamesCatalogData({
      location,
      store,
      pathFilters,
      query,
      filterSubcats,
      currentUser,
      appSettings,
      appToken,
    });
  }

  return preloadGameData({
    store,
    id: subroutes[0],
    location,
  });
};

export default prepareFn;
