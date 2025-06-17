import cond from 'ramda/src/cond';
import propEq from 'ramda/src/propEq';

import { loadDiscoverFollowings } from 'app/pages/discover/discover.actions';
import { getStores, getGenres } from 'app/pages/app/app.actions';

import { entityFromPath } from 'app/pages/games-static-filters/games-static-filters.lib';

import {
  loadPlatform,
  loadGenre,
  loadStore,
  loadCategory,
  loadPublisher,
  loadDeveloper,
  loadTag,
} from 'app/pages/games-static-filters/games-static-filters.actions';
import { entityFromFilters } from 'app/pages/games-routes/games-routes.lib';

import { loadCatalog, loadCatalogGames } from './games.actions';

const loadEntity = cond([
  [propEq('section', 'platforms'), ({ slug }) => loadPlatform({ id: slug })],
  [propEq('section', 'genres'), ({ slug }) => loadGenre({ id: slug })],
  [propEq('section', 'stores'), ({ slug }) => loadStore({ id: slug })],
  [propEq('section', 'categories'), ({ slug }) => loadCategory({ id: slug })],
  [propEq('section', 'publishers'), ({ slug }) => loadPublisher({ id: slug })],
  [propEq('section', 'developers'), ({ slug }) => loadDeveloper({ id: slug })],
  [propEq('section', 'tags'), ({ slug }) => loadTag({ id: slug })],
]);

const prepareFn = async ({ store, params = {}, location }) => {
  const { pathname } = location;
  const { filters } = params;
  const { page = 1, ...filter } = filters;

  await Promise.all([store.dispatch(loadCatalog()), store.dispatch(getGenres()), store.dispatch(getStores())]);

  const { slug } = entityFromPath(pathname);
  const { section } = entityFromFilters(filter) || {};

  const entityLoading = section && slug ? loadEntity({ section, slug }) : undefined;

  await Promise.all([
    entityLoading && store.dispatch(entityLoading),
    store.dispatch(loadDiscoverFollowings()),
    store.dispatch(
      loadCatalogGames({
        page,
        filter,
      }),
    ),
  ]);
};

export default prepareFn;
