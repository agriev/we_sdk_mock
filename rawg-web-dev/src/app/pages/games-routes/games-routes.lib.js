/* eslint-disable camelcase */

import values from 'lodash/values';
import toPairs from 'lodash/toPairs';
import pickBy from 'lodash/pickBy';
import isArray from 'lodash/isArray';
import includes from 'lodash/includes';

import cond from 'ramda/src/cond';
import propSatisfies from 'ramda/src/propSatisfies';
import isNil from 'ramda/src/isNil';
import complement from 'ramda/src/complement';
import either from 'ramda/src/either';

import { getDisableUserPlatformsFilter } from 'app/ui/filter/filter.funcs';

const FILTERS = ['ordering', 'years', 'developers', 'publishers', 'categories', 'tags'];

// getSubroutes :: String -> Array String
export const getSubroutes = (pathname) => pathname.split('/').slice(2);

const isFilterValue = (value, key) => includes(FILTERS, key);

export const getCatalogFiltersFromQuery = (query) => pickBy(query, isFilterValue);

// getFilterType :: (String, Array String) -> String
const getFilterType = (value, foundTypes, filterSubcats) => {
  // filterSubcatsTypes :: Array String
  const filterSubcatsTypes = Object.keys(filterSubcats);

  // containsSlug :: (Array Object, String) -> Boolean
  const containsSlug = (collection, slugValue) => collection.some(({ slug }) => slug === slugValue);

  // excludeTypes :: Array String -> Array String
  const excludeTypes = (types) => filterSubcatsTypes.filter((type) => !types.includes(type));

  // findFilterType :: (Array String, String) -> String
  const findFilterType = (types, slug) => filterSubcatsTypes.find((type) => containsSlug(filterSubcats[type], slug));

  return findFilterType(excludeTypes(foundTypes), value);
};

const maybeGetSubrouteWithType = (subroute, maybeType) => maybeType && { [maybeType]: subroute };

// getGamesRoutesFilters :: (Object, Array String) -> Object
const getGamesRoutesFilters = (filterSubcats, subroutes) =>
  subroutes.reduce(
    (filters, subroute) => ({
      ...filters,
      ...maybeGetSubrouteWithType(subroute, getFilterType(subroute, Object.keys(filters), filterSubcats)),
    }),
    {},
  );

// replaceSlugsWithIds :: (Object, Object) -> Object
const replaceSlugsWithIds = (filters, filterSubcats) => {
  // getIdBySlug :: (String, String) -> Number
  const getIdBySlug = (type, slugValue) => filterSubcats[type].find(({ slug }) => slug === slugValue).id;

  return toPairs(filters).reduce((fltrs, [type, slug]) => ({ ...fltrs, [type]: getIdBySlug(type, slug) }), {});
};

// prepareYearsForGames :: (Array Object, String, Array String) -> Array String
const prepareYearsForGames = (pathYear, queryYears, years) => {
  const getYear = (yearSlug) => years.find(({ slug }) => slug === yearSlug);

  const maybeConcatYearId = (yrs, maybeYear) => (maybeYear ? yrs.concat(maybeYear.id) : yrs);

  const replaceQueryYearsSlugsWithIds = () =>
    queryYears.reduce((yrs, yearSlug) => maybeConcatYearId(yrs, getYear(yearSlug)), []);

  return (
    pathYear && {
      dates: [pathYear].concat(replaceQueryYearsSlugsWithIds()).join('.'),
    }
  );
};

export const prepareFiltersForGames = ({
  pathFilters,
  queryFilters,
  filterSubcats,
  location,
  appSettings,
  currentUser,
  appToken,
}) => {
  const { years: pathYear, ...restPathFilters } = replaceSlugsWithIds(pathFilters, filterSubcats);
  const { years: maybeQueryYears, ...restQueryFilters } = queryFilters;

  const queryYears = [].concat(maybeQueryYears).filter((yr) => yr);

  return {
    ...restQueryFilters,
    ...restPathFilters,
    ...prepareYearsForGames(pathYear, queryYears, filterSubcats.years),
    ...getDisableUserPlatformsFilter({ location, appSettings, currentUser, appToken, checkSection: false }),
  };
};

// parseFiltersFromPath :: (String, Object)
export const parseFiltersFromPath = (path, filterSubcats) => getGamesRoutesFilters(filterSubcats, getSubroutes(path));

export const maybeGetYears = (pathYear, queryYears) =>
  pathYear && { years: [pathYear].concat(queryYears).filter((yr) => yr) };

// mergePathAndQueryFilters :: (Object, Object) -> Object
export const mergePathAndQueryFilters = (pathFilters, queryFilters) => ({
  ...queryFilters,
  ...pathFilters,
  ...maybeGetYears(pathFilters.years, queryFilters.years),
});

// isGamesRoute :: (Object, Array String) -> Boolean
export const isGamesRoute = (filters, subroutes) => Object.keys(filters).length > 0 || subroutes.length === 0;

// isFilterSubcatsLoaded :: Object -> Boolean
export const isFilterSubcatsLoaded = (filterSubcats) => values(filterSubcats).every((subcat) => subcat.length > 0);

const notNil = complement(isNil);
const checkKey = (key) => propSatisfies(notNil, key);

const isPlatform = either(checkKey('parent_platforms'), checkKey('platforms'));
const isGenre = checkKey('genres');
const isStore = checkKey('stores');
const isCategory = checkKey('categories');
const isPublisher = checkKey('publishers');
const isDevelopment = checkKey('developers');
const isTag = checkKey('tags');

const returnSec = (type, keys) => (filter) => {
  const section = isArray(keys) ? keys[0] : keys;
  const section2 = isArray(keys) ? keys[1] : undefined;

  return {
    type,
    section,
    slug: filter[section] || filter[section2],
  };
};

export const entityFromFilters = cond([
  [isPlatform, returnSec('platform', ['platforms', 'parent_platforms'])],
  [isGenre, returnSec('genre', 'genres')],
  [isStore, returnSec('store', 'stores')],
  [isCategory, returnSec('category', 'categories')],
  [isPublisher, returnSec('publisher', 'publishers')],
  [isDevelopment, returnSec('developer', 'developers')],
  [isTag, returnSec('tag', 'tags')],
]);
