/* eslint-disable import/prefer-default-export */

import entityAction from 'redux-logic/action-creators/entity-action';

export const PUBLISHER_LOAD_START = 'PUBLISHER_LOAD_START';
export const PUBLISHER_LOAD_SUCCESS = 'PUBLISHER_LOAD_SUCCESS';
export const PUBLISHER_LOAD_FAILED = 'PUBLISHER_LOAD_FAILED';

export const DEVELOPER_LOAD_START = 'DEVELOPER_LOAD_START';
export const DEVELOPER_LOAD_SUCCESS = 'DEVELOPER_LOAD_SUCCESS';
export const DEVELOPER_LOAD_FAILED = 'DEVELOPER_LOAD_FAILED';

export const TAG_LOAD_START = 'TAG_LOAD_START';
export const TAG_LOAD_SUCCESS = 'TAG_LOAD_SUCCESS';
export const TAG_LOAD_FAILED = 'TAG_LOAD_FAILED';

export const CATEGORY_LOAD_START = 'CATEGORY_LOAD_START';
export const CATEGORY_LOAD_SUCCESS = 'CATEGORY_LOAD_SUCCESS';
export const CATEGORY_LOAD_FAILED = 'CATEGORY_LOAD_FAILED';

export const PLATFORM_LOAD_START = 'PLATFORM_LOAD_START';
export const PLATFORM_LOAD_SUCCESS = 'PLATFORM_LOAD_SUCCESS';
export const PLATFORM_LOAD_FAILED = 'PLATFORM_LOAD_FAILED';

export const GENRE_LOAD_START = 'GENRE_LOAD_START';
export const GENRE_LOAD_SUCCESS = 'GENRE_LOAD_SUCCESS';
export const GENRE_LOAD_FAILED = 'GENRE_LOAD_FAILED';

export const STORE_LOAD_START = 'STORE_LOAD_START';
export const STORE_LOAD_SUCCESS = 'STORE_LOAD_SUCCESS';
export const STORE_LOAD_FAILED = 'STORE_LOAD_FAILED';

export const loadPublisher = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/publishers/${action.id}`,
  dataPath: 'staticFilters.publishers',
  types: [PUBLISHER_LOAD_START, PUBLISHER_LOAD_SUCCESS, PUBLISHER_LOAD_FAILED],
});

export const loadDeveloper = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/developers/${action.id}`,
  dataPath: 'staticFilters.developers',
  types: [DEVELOPER_LOAD_START, DEVELOPER_LOAD_SUCCESS, DEVELOPER_LOAD_FAILED],
});

export const loadTag = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/tags/${action.id}`,
  dataPath: 'staticFilters.tags',
  types: [TAG_LOAD_START, TAG_LOAD_SUCCESS, TAG_LOAD_FAILED],
});

export const loadCategory = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/categories/${action.id}`,
  dataPath: 'staticFilters.categories',
  types: [CATEGORY_LOAD_START, CATEGORY_LOAD_SUCCESS, CATEGORY_LOAD_FAILED],
});

export const loadPlatform = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/platforms/${action.id}`,
  dataPath: 'staticFilters.platforms',
  types: [PLATFORM_LOAD_START, PLATFORM_LOAD_SUCCESS, PLATFORM_LOAD_FAILED],
});

export const loadGenre = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/genres/${action.id}`,
  dataPath: 'staticFilters.genres',
  types: [GENRE_LOAD_START, GENRE_LOAD_SUCCESS, GENRE_LOAD_FAILED],
});

export const loadStore = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/stores/${action.id}`,
  dataPath: 'staticFilters.stores',
  types: [STORE_LOAD_START, STORE_LOAD_SUCCESS, STORE_LOAD_FAILED],
});
