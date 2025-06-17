/* eslint-disable import/prefer-default-export */

import cookies from 'browser-cookies';

import env from 'config/env';
import getLoadingConsts from 'tools/redux/get-loading-consts';
import paginatedAction from 'redux-logic/action-creators/paginated-action';
import Schemas from 'redux-logic/schemas';

export const REVIEWS_NEW = getLoadingConsts('REVIEWS_NEW');
export const REVIEWS_POPULAR = getLoadingConsts('REVIEWS_POPULAR');

export const REVIEWS_PAGE_SIZE = 20;

const modeCookieKey = 'reviews-display-mode';

export const REVIEWS_SET_DISPLAY_MODE = 'REVIEWS_SET_DISPLAY_MODE';

export const loadNewReviews = paginatedAction({
  pageSize: REVIEWS_PAGE_SIZE,
  endpoint: '/api/reviews?ordering=-created',
  dataPath: 'reviews.new',
  types: REVIEWS_NEW.array,
  schema: Schemas.REVIEW_ARRAY,
  reload: false,
});

export const loadPopularReviews = paginatedAction({
  pageSize: REVIEWS_PAGE_SIZE,
  endpoint: '/api/reviews/lists/main',
  dataPath: 'reviews.popular',
  types: REVIEWS_POPULAR.array,
  schema: Schemas.REVIEW_ARRAY,
  reload: false,
});

function getCurrentMode(requestCookies) {
  if (typeof window !== 'undefined') {
    return cookies.get(modeCookieKey);
  }

  return (requestCookies || {})[modeCookieKey];
}

export function setReviewsDisplayMode(modeArgument) {
  return async (dispatch, getState) => {
    const state = getState();
    const mode = modeArgument || getCurrentMode(state.app.request.cookies);

    if (modeArgument && env.isClient()) {
      cookies.set(modeCookieKey, mode, { expires: 365 });
    }

    if (mode) {
      dispatch({
        type: REVIEWS_SET_DISPLAY_MODE,
        data: {
          mode,
        },
      });
    }
  };
}
