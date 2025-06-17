import { combineReducers } from 'redux';

import {
  SUGGESTIONS_SHOWCASE_LOAD,
  SUGGESTIONS_SHOWCASE_LOAD_SUCCESS,
  SUGGESTIONS_ENTITY_LOAD_START,
  SUGGESTIONS_ENTITY_LOAD_FINISH,
  SUGGESTIONS_ENTITY_LOAD_FAILED,
  SUGGESTIONS_ENTITY_META_LOAD_FINISH,
  SUGGESTIONS_ENTITY_META_LOAD_FAILED,
  SUGGESTIONS_ENTITY_META_LOAD_START,
  SUGGESTIONS_SHOWCASE_LOAD_FAILED,
} from 'app/pages/suggestions/suggestions.actions';

import paginate from 'redux-logic/reducer-creators/paginate';
import entities from 'redux-logic/reducer-creators/entities';

const entityMetaInitialState = {
  loading: false,
  id: undefined,
  name: '',
  slug: undefined,
  description: '',
  created: undefined,
  updated: undefined,
  games_count: 0,
  image: undefined,
  seo_title: '',
  seo_description: '',
  seo_h1: '',
};

const suggestions = combineReducers({
  showcase: paginate({
    types: [SUGGESTIONS_SHOWCASE_LOAD, SUGGESTIONS_SHOWCASE_LOAD_SUCCESS, SUGGESTIONS_SHOWCASE_LOAD_FAILED],
  }),
  entity: combineReducers({
    meta: entities({
      initialState: entityMetaInitialState,
      mapActionToKey: (action) => action.id,
      types: [
        SUGGESTIONS_ENTITY_META_LOAD_START,
        SUGGESTIONS_ENTITY_META_LOAD_FINISH,
        SUGGESTIONS_ENTITY_META_LOAD_FAILED,
      ],
    }),
    games: paginate({
      mapActionToKey: (action) => action.id,
      types: [SUGGESTIONS_ENTITY_LOAD_START, SUGGESTIONS_ENTITY_LOAD_FINISH, SUGGESTIONS_ENTITY_LOAD_FAILED],
    }),
  }),
});

export default suggestions;
