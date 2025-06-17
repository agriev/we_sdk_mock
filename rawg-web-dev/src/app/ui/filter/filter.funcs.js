/* eslint-disable import/prefer-default-export */

import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';

import pick from 'ramda/src/pick';
import pipe from 'ramda/src/pipe';
import tryCatch from 'ramda/src/tryCatch';
import always from 'ramda/src/always';

import objValsToArray from 'tools/obj-vals-to-array';
import { myPlatformsFilterWorthShow } from 'app/components/discover-filter/discover-filter.funcs';

const possibleFilterKeys = [
  'categories',
  'tags',
  'ordering',
  'platforms',
  'publishers',
  'developers',
  'parent_platforms',
  'stores',
  'genres',
  'dates',
];

const filterKeys = pipe(
  pick(possibleFilterKeys),
  objValsToArray,
);

/**
 * Очистить строку запроса от странных данных,
 * которые приходят со стороны браузера.
 *
 * @param {string} filterStr Строка запроса
 */
export const cleanQuery = (filterString, filterKeysFunc = filterKeys) => {
  if (filterString) {
    try {
      const filterObject =
        typeof filterString === 'string' ? JSON.parse(decodeURIComponent(filterString)) : filterString;

      if (isPlainObject(filterObject)) {
        return filterKeysFunc(filterObject);
      }
    } catch (e) {
      return {};
    }
  }

  return {};
};

export const prepareFilter = (filterArgument, value = '-released') => {
  const filterObject = cleanQuery(filterArgument);

  if (get(filterObject, 'ordering', []).length === 0) {
    return {
      ...filterObject,
      ordering: [value],
    };
  }

  return filterObject;
};

export const getDisableUserPlatformsFilter = ({ appSettings, appToken, currentUser, section, checkSection = true }) => {
  const showMyPlatformsFilter = myPlatformsFilterWorthShow(currentUser, section, checkSection, appToken);
  const disableUserPlatforms = showMyPlatformsFilter && appSettings && appSettings.showOnlyMyPlatforms === false;

  if (disableUserPlatforms) {
    return {
      disable_user_platforms: 'true',
    };
  }

  return undefined;
};

export const getFiltersQueryFromLocation = tryCatch(
  (location) => JSON.parse(get(location, 'query.filters', '{}')),
  always({}),
);

export const getFiltersFromLocation = ({ location, appSettings, appToken, currentUser, section }) => {
  return {
    ...getFiltersQueryFromLocation(location),
    ...getDisableUserPlatformsFilter({ appSettings, appToken, currentUser, section, checkSection: true }),
  };
};
