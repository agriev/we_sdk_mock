import includes from 'lodash/includes';
import isString from 'lodash/isString';

import when from 'ramda/src/when';
import last from 'ramda/src/last';
import head from 'ramda/src/head';
import pipe from 'ramda/src/pipe';
import prop from 'ramda/src/prop';
import findIndex from 'ramda/src/findIndex';
import propEq from 'ramda/src/propEq';
import inc from 'ramda/src/inc';
import dec from 'ramda/src/dec';
import nth from 'ramda/src/nth';
import flip from 'ramda/src/flip';
import max from 'ramda/src/max';
import min from 'ramda/src/min';
import equals from 'ramda/src/equals';
import notEquals from 'tools/ramda/not-equals';
import getIds from 'tools/ramda/get-ids';

import memoizeOne from 'memoize-one';

export const NEW_ITEM_KEY = 'add_new_tag_to_base';

const valueIsPartOfItem = (item, value) => includes(item.toLowerCase(), value.toLowerCase());

export const getSearchResults = memoizeOne(({ addedItems, availableItems, value }) => {
  return availableItems.filter((item) => {
    if (isString(item)) {
      return valueIsPartOfItem(item, value) && !addedItems.includes(item);
    }

    return !getIds(addedItems).includes(item.id);
  });
});

export function getNextSuggest(current, suggests) {
  if (suggests.length === 0) return undefined;

  const lastElementId = pipe(
    last,
    prop('id'),
  )(suggests);
  const isNotLast = pipe(
    prop('id'),
    notEquals(lastElementId),
  );
  const getByIndex = flip(nth)(suggests);
  const getNext = pipe(
    findIndex(propEq('id', current && current.id)),
    inc,
    min(suggests.length - 1),
    getByIndex,
  );

  return when(isNotLast, getNext, suggests);
}

export function getPrevSuggest(current, suggests) {
  if (suggests.length === 0) return undefined;

  const firstElementId = pipe(
    head,
    prop('id'),
  )(suggests);
  const isNotFirst = pipe(
    prop('id'),
    notEquals(firstElementId),
  );
  const getByIndex = flip(nth)(suggests);
  const getPrevious = pipe(
    findIndex(propEq('id', current && current.id)),
    dec,
    max(0),
    getByIndex,
  );

  return when(isNotFirst, getPrevious, suggests);
}

export function getNextStringSuggest(current, suggests, newKey) {
  if (suggests.length === 0) return newKey;

  const allSuggests = newKey ? [...suggests, newKey] : suggests;

  const lastElement = last(allSuggests);
  const isNotLast = notEquals(lastElement);
  const getByIndex = flip(nth)(allSuggests);
  const getNext = pipe(
    findIndex(equals(current)),
    inc,
    min(allSuggests.length - 1),
    getByIndex,
  );

  return when(isNotLast, getNext, allSuggests);
}

export function getPrevStringSuggest(current, suggests, newKey) {
  if (suggests.length === 0) return undefined;

  const allSuggests = newKey ? [...suggests, newKey] : suggests;

  const firstElement = head(allSuggests);
  const isNotFirst = notEquals(firstElement);
  const getByIndex = flip(nth)(allSuggests);
  const getPrevious = pipe(
    findIndex(equals(current)),
    dec,
    max(0),
    getByIndex,
  );

  return when(isNotFirst, getPrevious, allSuggests);
}

export default {
  getSearchResults,
  getNextSuggest,
  getPrevSuggest,
  getNextStringSuggest,
  getPrevStringSuggest,
  NEW_ITEM_KEY,
};
