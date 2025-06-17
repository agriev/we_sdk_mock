import paginatedAction from 'redux-logic/action-creators/paginated-action';
import Schemas from 'redux-logic/schemas';
import entityAction from 'redux-logic/action-creators/entity-action';

export const SHOWCASE_PAGE_SIZE = 10;
export const ENTITY_PAGE_SIZE = 20;

export const SUGGESTIONS_SHOWCASE_LOAD = 'SUGGESTIONS_SHOWCASE_LOAD';
export const SUGGESTIONS_SHOWCASE_LOAD_SUCCESS = 'SUGGESTIONS_SHOWCASE_LOAD_SUCCESS';
export const SUGGESTIONS_SHOWCASE_LOAD_FAILED = 'SUGGESTIONS_SHOWCASE_LOAD_FAILED';

export const loadSuggestionsShowcase = paginatedAction({
  pageSize: SHOWCASE_PAGE_SIZE,
  endpoint: '/api/suggestions',
  dataPath: 'suggestions.showcase',
  reload: false,
  types: [SUGGESTIONS_SHOWCASE_LOAD, SUGGESTIONS_SHOWCASE_LOAD_SUCCESS, SUGGESTIONS_SHOWCASE_LOAD_FAILED],
  schema: Schemas.SUGGESTION_ARRAY,
});

export const SUGGESTIONS_ENTITY_META_LOAD_START = 'SUGGESTIONS_PAGE_META_LOAD_START';
export const SUGGESTIONS_ENTITY_META_LOAD_FINISH = 'SUGGESTIONS_PAGE_META_LOAD_FINISH';
export const SUGGESTIONS_ENTITY_META_LOAD_FAILED = 'SUGGESTIONS_PAGE_META_LOAD_FAILED';

export const loadSuggestionsMeta = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/suggestions/${action.id}`,
  dataPath: 'suggestions.entity.meta',
  types: [SUGGESTIONS_ENTITY_META_LOAD_START, SUGGESTIONS_ENTITY_META_LOAD_FINISH, SUGGESTIONS_ENTITY_META_LOAD_FAILED],
});

export const SUGGESTIONS_ENTITY_LOAD_START = 'SUGGESTIONS_PAGE_LOAD_START';
export const SUGGESTIONS_ENTITY_LOAD_FINISH = 'SUGGESTIONS_PAGE_LOAD_FINISH';
export const SUGGESTIONS_ENTITY_LOAD_FAILED = 'SUGGESTIONS_PAGE_LOAD_FAILED';

export const loadSuggestionsGames = paginatedAction({
  pageSize: ENTITY_PAGE_SIZE,
  endpoint: (action) => `/api/suggestions/${action.id}/games`,
  dataPath: 'suggestions.entity.games',
  reload: true,
  types: [SUGGESTIONS_ENTITY_LOAD_START, SUGGESTIONS_ENTITY_LOAD_FINISH, SUGGESTIONS_ENTITY_LOAD_FAILED],
  schema: Schemas.GAME_ARRAY,
});
