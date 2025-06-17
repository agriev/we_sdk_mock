import take from 'lodash/take';

import len from 'tools/array/len';

import {
  loadNoteworthy,
  loadNextMonth,
  loadPopularInWishlists,
  loadNewFollow,
  loadFriendsPlaying,
  loadBecauseCompleted,
  loadFriendsReviews,
  DISCOVER_MAIN_FRIENDS_REVIEWS_PAGE_SIZE,
  DISCOVER_MAIN_FEATURED_REVIEWS_PAGE_SIZE,
  COLLECTION_GAMES_PAGE_SIZE,
  loadFeaturedReviews,
} from 'app/pages/discover-main/discover-main.actions';
import { loadCollectionFeed } from 'app/pages/collection/collection.actions';

const makeLoader = (dispatch, token, func, page) => () => dispatch(func({ page, token }));

export const getNoteworthyLoader = (noteworthyData, dispatch, token) => {
  return makeLoader(dispatch, token, loadNoteworthy, noteworthyData.next);
};

export const getNextMonthLoader = (nextMonthData, dispatch, token) => {
  return makeLoader(dispatch, token, loadNextMonth, nextMonthData.next);
};

export const getPopularLoader = (popularInWishlistsData, dispatch, token) => {
  return makeLoader(dispatch, token, loadPopularInWishlists, popularInWishlistsData.next);
};

export const getFollowLoader = (newFollowData, dispatch, token) => {
  return makeLoader(dispatch, token, loadNewFollow, newFollowData.next);
};

export const getFriendsLoader = (friendsPlayingData, dispatch, token) => {
  return makeLoader(dispatch, token, loadFriendsPlaying, friendsPlayingData.next);
};

export const getCompletedLoader = (becauseCompletedData, dispatch, token) => {
  return makeLoader(dispatch, token, loadBecauseCompleted, becauseCompletedData.next);
};

export const getReviewsLoader = ({
  friendsReviews,
  friendsReviewsData,
  featuredReviews,
  featuredReviewsData,
  dispatch,
  token,
}) => {
  const friendsReviewsActive = len(friendsReviews) >= 4;
  const reviews = take(friendsReviewsActive ? friendsReviews : featuredReviews, 8);
  const reviewsData = friendsReviewsActive ? friendsReviewsData : featuredReviewsData;
  const loadReviews = friendsReviewsActive ? loadFriendsReviews : loadFeaturedReviews;
  const loadReviewsCallback = makeLoader(dispatch, token, loadReviews, reviewsData.next);

  const reviewsMessage = friendsReviewsActive
    ? 'discover.main_heading_reviews_friends'
    : 'discover.main_heading_reviews_featured';

  const reviewsPageSize = friendsReviewsActive
    ? DISCOVER_MAIN_FRIENDS_REVIEWS_PAGE_SIZE
    : DISCOVER_MAIN_FEATURED_REVIEWS_PAGE_SIZE;

  return {
    reviews,
    reviewsData,
    reviewsMessage,
    reviewsPageSize,
    loadReviewsCallback,
  };
};

export const getCollectionsData = ({ collection, collectionFeed, collectionFeedData, dispatch }) => {
  const collectionGames = collectionFeed.map((item) => ({
    ...item.game,
    description: item.text,
    feedItemId: item.id,
    embedData: {
      text_attachments: item.text_attachments,
      text_previews: item.text_previews,
    },
  }));

  const { count, next, loading, loaded } = collectionFeedData;
  const collectionData = {
    count,
    next,
    loading,
    loaded,
  };

  return {
    collectionData,
    collectionGames,
    collectionLoader: async () => {
      await dispatch(loadCollectionFeed(collection.slug, collectionFeedData.next, COLLECTION_GAMES_PAGE_SIZE));
    },
  };
};
