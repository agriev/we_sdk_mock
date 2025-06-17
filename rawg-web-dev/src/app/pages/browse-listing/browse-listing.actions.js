import urlParse from 'url-parse';

import isFunction from 'lodash/isFunction';

import fetch from 'tools/fetch';

export const BROWSE_LISTING_LOAD = 'BROWSE_LISTING_LOAD';
export const BROWSE_LISTING_LOAD_SUCCESS = 'BROWSE_LISTING_LOAD_SUCCESS';

export const BROWSE_PAGE_SIZE = 20;

export const getBrowsePageSize = ({ currentUser }) => {
  // Во имя seo мы отдаём гостям более жирные пачки данных на одной странице
  return currentUser.id ? 20 : 40;
};

const getNextPage = (nextUrl) => {
  const parsedUrl = nextUrl && urlParse(nextUrl, true);
  return (parsedUrl && +parsedUrl.query.page) || null;
};

const setListingResults = (listingType, page, data) => ({
  type: BROWSE_LISTING_LOAD_SUCCESS,
  data: {
    listing: {
      ...data,
      next: getNextPage(data.next),
    },
    listingType,
    push: page > 1,
  },
});

export const loadListing = ({ listingType, page = 1, pageSize: pageSizeArg = getBrowsePageSize }) => (
  dispatch,
  getState,
) => {
  const state = getState();
  const uri = `/api/${listingType}`;
  const pageSize = isFunction(pageSizeArg) ? pageSizeArg(state) : pageSizeArg;

  dispatch({ type: BROWSE_LISTING_LOAD });

  return fetch(uri, {
    method: 'get',
    state,
    data: { page, page_size: pageSize },
  }).then((res) => dispatch(setListingResults(listingType, page, res)));
};
