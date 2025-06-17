import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';

import { toPluralType } from 'tools/urls/entity-from-url';

const extractPath = (path) => path.split('/').slice(1);

const getEntityType = cond([
  [equals('publishers'), always('publisher')],
  [equals('developers'), always('developer')],
  [equals('categories'), always('category')],
  [equals('tags'), always('tag')],
  [equals('utags'), always('tag')],
  [equals('platforms'), always('platform')],
  [equals('genres'), always('genre')],
  [equals('stores'), always('store')],
]);

export const entityFromPath = (path) => {
  const [section, slug] = extractPath(path);
  const entity = getEntityType(section);

  return { section, entity, slug };
};

export const getPathFilter = (pathname) => {
  const [section, slug] = extractPath(pathname);
  const entityType = toPluralType(getEntityType(section));
  return { [entityType]: slug };
};

export const getFiltersFromPathAndQuery = (pathname, query) => ({
  ...query,
  ...getPathFilter(pathname),
});
