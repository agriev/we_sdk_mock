import { combineReducers } from 'redux';

import assoc from 'ramda/src/assoc';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import paginate from 'redux-logic/reducer-creators/paginate';

import {
  DISCOVER_MAIN_NOTEWORTHY,
  DISCOVER_MAIN_BECAUSE_COMPLETED,
  DISCOVER_MAIN_FRIENDS_REVIEWS,
  DISCOVER_MAIN_FRIENDS_PLAYING,
  DISCOVER_MAIN_NEW_FOLLOW,
  DISCOVER_MAIN_PLATFORMS_EXCLUSIVES,
  DISCOVER_MAIN_NEXT_MONTH,
  DISCOVER_MAIN_POPULAR_IN_WISHLISTS,
  DISCOVER_MAIN_FEATURED,
  DISCOVER_MAIN_FEATURED_REVIEWS,
  DISCOVER_MAIN_LOADING,
} from 'app/pages/discover-main/discover-main.actions';
import createReducer from 'tools/redux/create-reducer';

const discoverMainReducer = combineReducers({
  wholeLoading: createReducer(false, {
    [DISCOVER_MAIN_LOADING.started]: F,
    [DISCOVER_MAIN_LOADING.success]: T,
  }),
  noteworthy: paginate({
    types: DISCOVER_MAIN_NOTEWORTHY.array,
  }),
  featured: paginate({
    types: DISCOVER_MAIN_FEATURED.array,
  }),
  nextMonth: paginate({
    types: DISCOVER_MAIN_NEXT_MONTH.array,
    additionalHandlers: {
      [DISCOVER_MAIN_NEXT_MONTH.success]: (state, { month }) => assoc('month', month, state),
    },
  }),
  popularInWishlists: paginate({
    types: DISCOVER_MAIN_POPULAR_IN_WISHLISTS.array,
  }),
  becauseCompleted: paginate({
    types: DISCOVER_MAIN_BECAUSE_COMPLETED.array,
    additionalHandlers: {
      [DISCOVER_MAIN_BECAUSE_COMPLETED.success]: (state, { game }) => {
        if (game) {
          return assoc('game', `g-${game.slug}`, state);
        }

        return state;
      },
    },
  }),
  friendsReviews: paginate({
    types: DISCOVER_MAIN_FRIENDS_REVIEWS.array,
  }),
  featuredReviews: paginate({
    types: DISCOVER_MAIN_FEATURED_REVIEWS.array,
  }),
  friendsPlaying: paginate({
    types: DISCOVER_MAIN_FRIENDS_PLAYING.array,
  }),
  newFollow: paginate({
    types: DISCOVER_MAIN_NEW_FOLLOW.array,
  }),
  platformsExclusives: paginate({
    types: DISCOVER_MAIN_PLATFORMS_EXCLUSIVES.array,
  }),
});

export default discoverMainReducer;
