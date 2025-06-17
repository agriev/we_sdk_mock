import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';

export const toSingularType = cond([
  [equals('platforms'), always('platform')],
  [equals('genres'), always('genre')],
  [equals('tags'), always('tag')],
  [equals('utags'), always('tag')],
  [equals('categories'), always('category')],
  [equals('creators'), always('person')],
  [equals('persons'), always('person')],
  [equals('developers'), always('developer')],
  [equals('publishers'), always('publisher')],
  [equals('stores'), always('store')],
]);

export const toPluralType = cond([
  [equals('platform'), always('platforms')],
  [equals('genre'), always('genres')],
  [equals('tag'), always('tags')],
  [equals('category'), always('categories')],
  [equals('person'), always('creators')],
  [equals('creator'), always('creators')],
  [equals('developer'), always('developers')],
  [equals('publisher'), always('publishers')],
  [equals('store'), always('stores')],
]);
