/* eslint-disable import/prefer-default-export */

import pick from 'lodash/pick';
import get from 'lodash/get';
import includes from 'lodash/includes';

import pipe from 'ramda/src/pipe';
import equals from 'ramda/src/equals';
import cond from 'ramda/src/cond';
import always from 'ramda/src/always';
import T from 'ramda/src/T';
import identity from 'ramda/src/identity';
import assoc from 'ramda/src/assoc';
import curry from 'ramda/src/curry';

import { cleanQuery } from 'app/ui/filter/filter.funcs';

import { sortTypes } from 'app/components/discover-filter/discover-filter';

import {
  isLibrarySection,
  DISCOVER_SEC_ALL_TIME,
  DISCOVER_SEC_FRIENDS,
  DISCOVER_SEC_MAIN,
  DISCOVER_SEC_LIBRARY_UNCATEGORIZED,
  DISCOVER_SEC_LIBRARY_PLAYED,
  DISCOVER_SEC_LIBRARY_PLAYING,
  DISCOVER_SEC_LIBRARY_COMPLETED,
  DISCOVER_SEC_LIBRARY_NOTPLAYED,
  DISCOVER_SEC_WISHLIST,
  DISCOVER_SEC_RECENT_PAST,
  DISCOVER_SEC_RECENT_CURRENT,
  DISCOVER_SEC_RECENT_FUTURE,
  DISCOVER_SEC_GAMES_LIKE,
} from 'app/pages/discover/discover.sections';

const cleanDiscoverQuery = (query) =>
  cleanQuery(query, (object) => {
    const possibleFilterKeys = ['ordering', 'dates', 'platforms', 'parent_platforms', 'disable_user_platforms'];
    // const keysWithRelevantData = possibleFilterKeys.filter((key) => Array.isArray(object[key]));

    return pick(object, possibleFilterKeys);
  });

const addSectionFilterOnLibrary = curry((section, filters) => {
  const is = (sec) => () => equals(sec, section);

  const addFilter = cond([
    [is(DISCOVER_SEC_LIBRARY_UNCATEGORIZED), assoc('statuses', 'owned')],
    [is(DISCOVER_SEC_LIBRARY_PLAYING), assoc('statuses', 'playing')],
    [is(DISCOVER_SEC_LIBRARY_COMPLETED), assoc('statuses', 'beaten')],
    [is(DISCOVER_SEC_LIBRARY_PLAYED), assoc('statuses', 'dropped')],
    [is(DISCOVER_SEC_LIBRARY_NOTPLAYED), assoc('statuses', 'yet')],
    [T, identity],
  ]);

  return addFilter(filters);
});

const addOrdering = curry((section, filter) => {
  const ordering = get(filter, 'ordering', []);
  const defaultOrdering = cond([
    [equals(DISCOVER_SEC_ALL_TIME), always(undefined)],
    [equals(DISCOVER_SEC_FRIENDS), always(sortTypes.created)],
    [equals(DISCOVER_SEC_MAIN), always(sortTypes.relevance)],
    [equals(DISCOVER_SEC_WISHLIST), always(sortTypes.created)],
    [isLibrarySection, always(sortTypes.released)],
    [T, always(sortTypes.added)],
  ])(section);

  if (ordering.length === 0 && defaultOrdering) {
    return {
      ...filter,
      ordering: [defaultOrdering],
    };
  }

  return filter;
});

export const prepareDiscoverFilter = (filterQuery, section) => {
  const processFilter = pipe(
    cleanDiscoverQuery,
    addSectionFilterOnLibrary(section),
    addOrdering(section),
  );

  return processFilter(filterQuery);
};

export const myPlatformsFilterCommonWorthShow = ({ appToken, currentUser }) => {
  if (!appToken && !currentUser) {
    return false;
  }

  if (currentUser && currentUser.id) {
    return currentUser.games_count > 0;
  }

  return !!appToken;
};

export const myPlatformsFilterWorthShow = (currentUser, section, checkSection, appToken) => {
  const commonCheck = myPlatformsFilterCommonWorthShow({ currentUser, appToken });

  if (!commonCheck) {
    return false;
  }

  if (checkSection) {
    if (!section) {
      return false;
    }

    return includes(
      [DISCOVER_SEC_RECENT_PAST, DISCOVER_SEC_RECENT_CURRENT, DISCOVER_SEC_RECENT_FUTURE, DISCOVER_SEC_GAMES_LIKE],
      section,
    );
  }

  return true;
};
