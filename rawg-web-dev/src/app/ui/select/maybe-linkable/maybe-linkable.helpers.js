/* eslint-disable react/prop-types, camelcase */

import React from 'react';
import { Link } from 'app/components/link';
import { stringify } from 'qs';

import isArray from 'lodash/isArray';
import find from 'lodash/find';
import get from 'lodash/get';
import has from 'lodash/has';
import head from 'lodash/head';

import equals from 'ramda/src/equals';
import compactObject from 'tools/compact-object';
import { parseFiltersFromPath } from 'app/pages/games-routes/games-routes.lib';
import { getFilterSubcats } from 'app/pages/games-routes/games-routes.selectors';

const toQuery = (object) => stringify(object, { indices: false });

const getNofollow = (nofollowCollections, { nofollow, empty, collection }) =>
  nofollowCollections.includes(collection) || nofollow || empty ? 'nofollow' : null;

const getFiltersPath = (...itms) => itms.reduce((path, filter) => (filter ? `${path}/${filter}` : path), '');

const toSlug = (item, items) => {
  if (isArray(item)) {
    const number = parseInt(item[0], 10);
    const isNumeric = !!number;
    if (isNumeric) {
      return get(find(items, { id: number }), 'slug');
    }
  }

  return item;
};

const removeOrAddToFilters = (item, collectionValue) => (item.slug === collectionValue ? undefined : item.slug);

export const makeBeautyLinks = ({
  urlBase,
  nofollowCollections,
  children,
  item,
  allGenres,
  allStores,
  allPlatforms,
  allYears,
  location,
  className,
  filters: {
    stores: storesFilter,
    genres: genresFilter,
    years: yearsFilter = [],
    dates: datesFilter, // eslint-disable-line no-unused-vars
    platforms: platformsFilter, // eslint-disable-line no-unused-vars
    parent_platforms: parentPlatformsFilter, // eslint-disable-line no-unused-vars
    ...restFilters
  },
}) => {
  const isYears = equals(item.collection, 'years');
  const isGenres = equals(item.collection, 'genres');
  const isStores = equals(item.collection, 'stores');
  const isOrdering = equals(item.collection, 'ordering');
  const orderingInQuery = has(location.query, 'ordering');
  const orderingFromFilters = orderingInQuery ? restFilters.ordering : undefined;
  const isPlatforms = ['platforms', 'parent_platforms'].includes(item.collection);

  const filterSubcats = getFilterSubcats({
    platforms: allPlatforms,
    years: allYears,
    genres: [],
    stores: [],
  });

  const filtersFromPath = parseFiltersFromPath(location.pathname, filterSubcats);
  const platforms = filtersFromPath.parent_platforms || filtersFromPath.platforms;
  const years = filtersFromPath.years || head(yearsFilter);

  const getYears = () => (years === item.slug ? undefined : item.slug);

  const genres = toSlug(genresFilter, allGenres);
  const stores = toSlug(storesFilter, allStores);

  const platform = isPlatforms ? removeOrAddToFilters(item, platforms) : platforms;
  const store = isStores ? removeOrAddToFilters(item, stores) : stores;
  const genre = isGenres ? removeOrAddToFilters(item, genres) : genres;
  const year = isYears ? getYears() : years;

  const ordering = isOrdering ? item.id : orderingFromFilters;

  const isClean = (collection, filter) => (item.clean && item.collection === collection ? undefined : filter);

  const filtersPath = getFiltersPath(
    isClean('platforms', platform),
    isClean('stores', store),
    isClean('genres', genre),
    isClean('years', year),
  );

  const filterQuery = toQuery(
    compactObject({
      ...restFilters,
      ordering,
      years: item.clean && isYears ? [] : undefined,
    }),
  );

  const path = `${urlBase}${filtersPath}${filterQuery ? `?${filterQuery}` : ''}`;

  return (
    <Link className={className} rel={getNofollow(nofollowCollections, item)} to={path}>
      {children}
    </Link>
  );
};

export const makeQueryLinks = ({
  urlBase,
  nofollowCollections,
  children,
  item,
  className,
  filters: { dates, ordering, platforms, parent_platforms },
}) => {
  const isYears = equals(item.collection, 'years');
  const isOrdering = equals(item.collection, 'ordering');
  const isPlatform = equals(item.collection, 'platforms');
  const isParentPlatform = equals(item.collection, 'parent_platforms');
  const isBothPlatform = isPlatform || isParentPlatform;

  const getYears = () => ((dates || []).includes(item.id) ? [] : [item.id]);

  const queryYears = isYears ? getYears() : dates;
  const orderingQuery = isOrdering ? [item.id] : ordering;
  const queryPlatforms = isPlatform ? [item.id] : platforms;
  const queryParentPlatforms = isParentPlatform ? [item.id] : parent_platforms;

  const filterQuery = encodeURIComponent(
    JSON.stringify(
      compactObject({
        ordering: orderingQuery,
        dates: item.clean && isYears ? undefined : queryYears,
        platforms: (item.clean && isBothPlatform) || isParentPlatform ? undefined : queryPlatforms,
        parent_platforms: (item.clean && isBothPlatform) || isPlatform ? undefined : queryParentPlatforms,
      }),
    ),
  );

  const path = `${urlBase}${filterQuery ? `?filters=${filterQuery}` : ''}`;

  return (
    <Link className={className} rel={getNofollow(nofollowCollections, item)} to={path}>
      {children}
    </Link>
  );
};
