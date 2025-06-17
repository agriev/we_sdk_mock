/* eslint-disable sonarjs/no-duplicate-string */

import { normalize } from 'normalizr';

import head from 'lodash/head';

import paginatedAction from 'redux-logic/action-creators/paginated-action';
import { UPDATE_ENTITIES } from 'redux-logic/entities';
import Schemas from 'redux-logic/schemas';
import getLoadingConsts from 'tools/redux/get-loading-consts';
import { loadPopularCollections } from 'app/pages/collections/collections.actions';
import { loadCollectionFeed } from 'app/pages/collection/collection.actions';

export const DISCOVER_MAIN_LOADING = getLoadingConsts('DISCOVER_MAIN_LOADING');
export const DISCOVER_MAIN_NOTEWORTHY = getLoadingConsts('DISCOVER_MAIN_NOTEWORTHY');
export const DISCOVER_MAIN_FEATURED = getLoadingConsts('DISCOVER_MAIN_FEATURED');
export const DISCOVER_MAIN_NEXT_MONTH = getLoadingConsts('DISCOVER_MAIN_NEXT_MONTH');
export const DISCOVER_MAIN_POPULAR_IN_WISHLISTS = getLoadingConsts('DISCOVER_MAIN_POPULAR_IN_WISHLISTS');
export const DISCOVER_MAIN_BECAUSE_COMPLETED = getLoadingConsts('DISCOVER_MAIN_BECAUSE_COMPLETED');
export const DISCOVER_MAIN_FRIENDS_REVIEWS = getLoadingConsts('DISCOVER_MAIN_FRIENDS_REVIEWS');
export const DISCOVER_MAIN_FEATURED_REVIEWS = getLoadingConsts('DISCOVER_MAIN_FEATURED_REVIEWS');
export const DISCOVER_MAIN_FRIENDS_PLAYING = getLoadingConsts('DISCOVER_MAIN_FRIENDS_PLAYING');
export const DISCOVER_MAIN_NEW_FOLLOW = getLoadingConsts('DISCOVER_MAIN_NEW_FOLLOW');
export const DISCOVER_MAIN_PLATFORMS_EXCLUSIVES = getLoadingConsts('DISCOVER_MAIN_PLATFORMS_EXCLUSIVES');

export const discoverMainLoadingStarted = () => {
  return async (dispatch) => {
    dispatch({
      type: DISCOVER_MAIN_LOADING.started,
    });
  };
};

export const discoverMainLoadingFinished = () => {
  return async (dispatch) => {
    dispatch({
      type: DISCOVER_MAIN_LOADING.success,
    });
  };
};

export const NOTEWORTHY_PAGE_SIZE = 5;

export const loadNoteworthy = paginatedAction({
  pageSize: NOTEWORTHY_PAGE_SIZE,
  endpoint: '/api/games/lists/new-and-noteworthy',
  dataPath: 'discover.main.noteworthy',
  types: DISCOVER_MAIN_NOTEWORTHY.array,
  schema: Schemas.GAME_ARRAY,
});

export const COLLECTION_PAGE_SIZE = 3;
export const COLLECTION_GAMES_PAGE_SIZE = 8;

export const loadCollection = () => {
  return async (dispatch, getState) => {
    await dispatch(loadPopularCollections(1, COLLECTION_PAGE_SIZE));

    const state = getState();
    const firstCollection = head(state.collections.popular.results);

    if (firstCollection) {
      await dispatch(loadCollectionFeed(firstCollection.slug, 1, COLLECTION_GAMES_PAGE_SIZE));
    }
  };
};

export const FEATURED_PAGE_SIZE = 3;

export const loadFeatured = paginatedAction({
  pageSize: FEATURED_PAGE_SIZE,
  endpoint: '/api/games/lists/featured',
  dataPath: 'discover.main.featured',
  types: DISCOVER_MAIN_FEATURED.array,
  schema: Schemas.GAME_ARRAY,
});

export const NEXT_MONTH_PAGE_SIZE = 5;

export const loadNextMonth = paginatedAction({
  pageSize: NEXT_MONTH_PAGE_SIZE,
  endpoint: '/api/games/lists/next-month',
  dataPath: 'discover.main.nextMonth',
  types: DISCOVER_MAIN_NEXT_MONTH.array,
  schema: Schemas.GAME_ARRAY,
});

export const POPULAR_IN_WISHLISTS_PAGE_SIZE = 5;

export const loadPopularInWishlists = paginatedAction({
  pageSize: POPULAR_IN_WISHLISTS_PAGE_SIZE,
  endpoint: '/api/games/lists/popular-wishlist',
  dataPath: 'discover.main.popularInWishlists',
  types: DISCOVER_MAIN_POPULAR_IN_WISHLISTS.array,
  schema: Schemas.GAME_ARRAY,
});

export const BECAUSE_COMPLETED_PAGE_SIZE = 5;

export const loadBecauseCompleted = paginatedAction({
  pageSize: BECAUSE_COMPLETED_PAGE_SIZE,
  endpoint: '/api/games/lists/because-completed',
  dataPath: 'discover.main.becauseCompleted',
  types: DISCOVER_MAIN_BECAUSE_COMPLETED.array,
  schema: Schemas.GAME_ARRAY,
  onlyAuthored: true,
  onSuccess: ({ dispatch, data }) => {
    if (data && data.game) {
      dispatch({
        type: UPDATE_ENTITIES,
        data: {
          results: normalize(data.game, Schemas.GAME),
        },
      });
    }
  },
});

export const DISCOVER_MAIN_FRIENDS_REVIEWS_PAGE_SIZE = 10;

export const loadFriendsReviews = paginatedAction({
  pageSize: DISCOVER_MAIN_FRIENDS_REVIEWS_PAGE_SIZE,
  endpoint: '/api/users/current/following/users/reviews',
  dataPath: 'discover.main.friendsReviews',
  types: DISCOVER_MAIN_FRIENDS_REVIEWS.array,
  schema: Schemas.REVIEW_ARRAY,
  onlyAuthored: true,
});

export const DISCOVER_MAIN_FEATURED_REVIEWS_PAGE_SIZE = 10;

export const loadFeaturedReviews = paginatedAction({
  pageSize: DISCOVER_MAIN_FEATURED_REVIEWS_PAGE_SIZE,
  endpoint: '/api/reviews/lists/popular',
  dataPath: 'discover.main.featuredReviews',
  types: DISCOVER_MAIN_FEATURED_REVIEWS.array,
  schema: Schemas.REVIEW_ARRAY,
});

export const FRIENDS_PLAYING_PAGE_SIZE = 5;

export const loadFriendsPlaying = paginatedAction({
  pageSize: FRIENDS_PLAYING_PAGE_SIZE,
  endpoint: '/api/users/current/following/users/games?ordering=-created',
  dataPath: 'discover.main.friendsPlaying',
  types: DISCOVER_MAIN_FRIENDS_PLAYING.array,
  schema: Schemas.GAME_ARRAY,
  onlyAuthored: true,
});

export const NEW_FOLLOW_PAGE_SIZE = 10;

export const loadNewFollow = paginatedAction({
  pageSize: NEW_FOLLOW_PAGE_SIZE,
  endpoint: '/api/users/current/following/instances/games',
  dataPath: 'discover.main.newFollow',
  types: DISCOVER_MAIN_NEW_FOLLOW.array,
  schema: Schemas.GAME_ARRAY,
  onlyAuthored: true,
});

export const PLATFORM_EXCLUSIVES_PAGE_SIZE = 5;

export const loadPlatformsExclusives = paginatedAction({
  pageSize: PLATFORM_EXCLUSIVES_PAGE_SIZE,
  endpoint: '/api/games',
  dataPath: 'discover.main.platformsExclusives',
  types: DISCOVER_MAIN_PLATFORMS_EXCLUSIVES.array,
  schema: Schemas.GAME_ARRAY,
});
