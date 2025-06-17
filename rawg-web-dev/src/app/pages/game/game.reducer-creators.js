import always from 'ramda/src/always';
import evolve from 'ramda/src/evolve';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import adjustByProp from 'tools/ramda/adjust-by-property';

import { GAME_USER_REVIEW_UPDATED } from 'redux-logic/reducers/games';

import {
  GAME_USER_COLLECTION_REMOVED,
  GAME_USER_COLLECTION_ADDED,
  GAME_USER_COLLECTIONS_LOADED,
  GAME_USER_COLLECTIONS_LOADING,
} from 'app/pages/game/game.actions';

const gameReducers = () => ({
  [GAME_USER_REVIEW_UPDATED]: (state, { review, gameSlug }) => {
    if (state.slug === gameSlug) {
      return evolve(
        {
          user_review: always(review),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTIONS_LOADING]: (state, { gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: always([]),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTIONS_LOADED]: (state, { gameSlug, collections }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: always(collections),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTION_ADDED]: (state, { collectionId, gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: adjustByProp(
            'id',
            collectionId,
            evolve({
              game_in_collection: T,
            }),
          ),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTION_REMOVED]: (state, { collectionId, gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: adjustByProp(
            'id',
            collectionId,
            evolve({
              game_in_collection: F,
            }),
          ),
        },
        state,
      );
    }

    return state;
  },
});

export default gameReducers;
