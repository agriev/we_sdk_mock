/* eslint-disable promise/no-callback-in-promise */

import { schema } from 'normalizr';

import path from 'ramda/src/path';
import prop from 'ramda/src/prop';

const newEntity = (name, idAttribute, relations = {}) =>
  new schema.Entity(name, relations, {
    idAttribute,
  });

// We use this Normalizr schemas to transform API responses from a nested form
// to a flat form where repos and users are placed in `entities`, and nested
// JSON objects are replaced with their IDs. This is very convenient for
// consumption by reducers, because we can easily build a normalized tree
// and keep it updated as we fetch more data.

// Read more about Normalizr: https://github.com/paularmstrong/normalizr

const platformSchema = newEntity('platforms', path(['platform', 'slug']));
const parentPlatformSchema = newEntity('parentPlatforms', path(['platform', 'slug']));
const mainPlatformsSchema = newEntity('mainPlatforms', prop('slug'));

const gameSchema = newEntity('games', (game) => `g-${game.slug}`, {
  platforms: [platformSchema],
  parent_platforms: [parentPlatformSchema],
});

const discoverSearchSchema = newEntity('discoverSearch', (item) => `${item.instance}-${item.slug}`, {
  platforms: [platformSchema],
  parent_platforms: [parentPlatformSchema],
});

const discoverFollowingsSchema = newEntity('discoverFollowings', (item) => `${item.instance}-${item.slug}`);

const suggesgionSchema = newEntity('suggestions', prop('slug'), {
  games: [gameSchema],
});

const collectionFeedSchema = newEntity('collectionFeed', prop('id'), {
  game: gameSchema,
});

const personSchema = newEntity('persons', prop('id'), {
  games: [gameSchema],
});

const notificationFeedSchema = newEntity('notificationFeed', prop('id'), {
  games: {
    results: [gameSchema],
  },
});

const reviewSchema = newEntity('reviews', (review) => review.id, {
  game: gameSchema,
});

// Schemas for Github API responses.
const Schemas = {
  GAME: gameSchema,
  GAME_ARRAY: [gameSchema],
  MAIN_PLATFORMS_ARRAY: [mainPlatformsSchema],
  REVIEW: reviewSchema,
  REVIEW_ARRAY: [reviewSchema],
  SUGGESTION: suggesgionSchema,
  SUGGESTION_ARRAY: [suggesgionSchema],
  COLLECTION_FEED: collectionFeedSchema,
  COLLECTION_FEED_ARRAY: [collectionFeedSchema],
  PERSON: personSchema,
  PERSON_ARRAY: [personSchema],
  NOTIFICATION_FEED: notificationFeedSchema,
  NOTIFICATION_FEED_ARRAY: [notificationFeedSchema],
  DISCOVER_SEARCH_ARRAY: [discoverSearchSchema],
  DISCOVER_FOLLOWINGS_ARRAY: [discoverFollowingsSchema],
};

export default Schemas;
