import compactObject from 'tools/compact-object';

import defaultTo from 'ramda/src/defaultTo';
import pipe from 'ramda/src/pipe';
import pick from 'ramda/src/pick';
import map from 'ramda/src/map';
import mapObjIndexed from 'ramda/src/mapObjIndexed';
import without from 'ramda/src/without';
import filter from 'ramda/src/filter';
import reject from 'ramda/src/reject';
import propSatisfies from 'ramda/src/propSatisfies';
import propEq from 'ramda/src/propEq';
import prop from 'ramda/src/prop';
import contains from 'ramda/src/contains';
import __ from 'ramda/src/__';
import ifElse from 'ramda/src/ifElse';
import always from 'ramda/src/always';
import when from 'ramda/src/when';
import both from 'ramda/src/both';
import is from 'ramda/src/is';
import isNil from 'ramda/src/isNil';
import curry from 'ramda/src/curry';
import isEmpty from 'ramda/src/isEmpty';
import difference from 'ramda/src/difference';

import intersectionBy from 'lodash/intersectionBy';
import differenceBy from 'lodash/differenceBy';
import unionBy from 'lodash/unionBy';

const delKeysWithUndefined = curry(compactObject)(__, isNil);

export const prepareSubmitData = pipe(
  prop('gameEdit'),
  pick([
    'name',
    'description',
    'alternative_names',
    'platforms',
    'genres',
    'publishers',
    'developers',
    'website',
    'reddit_url',
    'tba',
    'released',
    'esrb_rating',
    'metacritic_url',
    'image',
  ]),
  mapObjIndexed((field, name) => {
    const processors = {
      obj: pipe(
        prop('changed'),
        defaultTo(field.current),
        reject(propSatisfies(contains(__, field.deleted), 'id')),
        map(prop('id')),
      ),
      arr: pipe(
        prop('changed'),
        defaultTo(field.current),
        without(field.deleted),
      ),
      def: pipe(
        prop('changed'),
        defaultTo(field.current),
      ),
    };

    // Если в поле image строка - значит это данные, которые вернул бэк,
    // не нужно их посылать на него, он в качестве image ждёт новый файл, а не строку-ссылку
    // с тем, что уже имеется на бекенде
    const isImageField = always(name === 'image');
    const clearIfStringImage = when(both(isImageField, is(String)), always(undefined));

    const isReleasedField = always(name === 'released');
    const clearIfReleasedEmpty = when(both(isReleasedField, isEmpty), always(undefined));

    return pipe(
      always(field),
      ifElse(
        propSatisfies(Array.isArray, 'current'),
        ifElse(propEq('type', 'objects'), processors.obj, processors.arr),
        processors.def,
      ),
      clearIfStringImage,
      clearIfReleasedEmpty,
    )();
  }),
  delKeysWithUndefined,
);

export function prepareAddObjectsData({ current, changed, deleted }) {
  const withoutDeleted = reject(propSatisfies(contains(__, deleted), 'id'));
  const changedItems = withoutDeleted(changed || []);

  return differenceBy(changedItems, intersectionBy(changedItems, current, 'id'));
}

export function prepareUpdateObjectsData({ current, changed, deleted }) {
  const changedItems = changed || [];

  const updatedItems = intersectionBy(changedItems, current, 'id');
  const deletedItems = filter(propSatisfies(contains(__, deleted), 'id'), current);

  return unionBy(updatedItems, deletedItems, 'id');
}

export const prepareTagsData = ({ changed, current, deleted }) => difference(defaultTo(current, changed), deleted);

export const fieldTitles = {
  name: 'game_edit.field_name',
  image: 'game_edit.field_cover_image',
  alternative_names: 'game_edit.field_alternative_names',
  description: 'game_edit.field_about',
  released: 'game_edit.field_released',
  esrb_rating: 'game_edit.field_esrb_rating',
  metacritic_url: 'game_edit.field_metacritic',
  platforms: 'game_edit.field_platforms',
  genres: 'game_edit.field_genres',
  publishers: 'game_edit.field_publishers',
  developers: 'game_edit.field_developers',
  website: 'game_edit.field_website',
  reddit_url: 'game_edit.field_reddit',
  creators: 'game_edit.creators',
  additions: 'game_edit.field_additions',
  screenshots: 'game_edit.screenshots',
  stores: 'game_edit.stores',
  tags: 'game_edit.tags',
};
