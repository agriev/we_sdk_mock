import paginatedAction from 'redux-logic/action-creators/paginated-action';
import getLoadingConsts from 'tools/redux/get-loading-consts';

export const SITEMAP_LOAD = getLoadingConsts('SITEMAP_LOAD');

export const sitemapPageSize = 150;

export const loadSitemap = paginatedAction({
  pageSize: sitemapPageSize,
  endpoint: ({ id }) => `/api/games/sitemap?letter=${encodeURIComponent(id)}`,
  dataPath: 'sitemap.letters',
  types: SITEMAP_LOAD.array,
  reload: false,
});
