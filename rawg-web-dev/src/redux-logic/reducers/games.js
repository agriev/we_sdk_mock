import evolve from 'ramda/src/evolve';
import always from 'ramda/src/always';
import T from 'ramda/src/T';
import F from 'ramda/src/F';
import concat from 'ramda/src/concat';
import __ from 'ramda/src/__';
import inc from 'ramda/src/inc';
import append from 'ramda/src/append';
import reject from 'ramda/src/reject';
import propEq from 'ramda/src/propEq';
import filter from 'ramda/src/filter';
import pipe from 'ramda/src/pipe';
import when from 'ramda/src/when';
import assoc from 'ramda/src/assoc';

import adjustByProp from 'tools/ramda/adjust-by-property';

import {
  GAME_USER_COLLECTIONS_LOADED,
  GAME_USER_COLLECTION_ADDED,
  GAME_USER_COLLECTION_REMOVED,
  GAME_USER_COLLECTIONS_LOADING,
} from 'app/pages/game/game.actions';

import {
  GAMECARD_COMMENTS_LOAD_SUCCESS,
  GAMECARD_COMMENTS_REPLIES_LOAD_SUCCESS,
  GAMECARD_COMMENT_CREATE_SUCCESS,
  GAMECARD_COMMENT_EDIT_SUCCESS,
  GAMECARD_COMMENT_REMOVE_SUCCESS,
} from 'app/components/game-card-comments/game-card-comments.actions';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

export const GAME_STATUS_UPDATED = 'GAME_STATUS_UPDATED';
export const GAME_USER_REVIEW_UPDATED = 'GAME_USER_REVIEW_UPDATED';

const assocUserCollections = when(propEq('user_collections', undefined), assoc('user_collections', []));

export const gamesReducerHandlers = (key) => ({
  [GAME_STATUS_UPDATED]: (state, { gameSlug, added, addedByStatus, userGame }) =>
    evolve(
      {
        [key(gameSlug)]: {
          added: always(added),
          added_by_status: always(addedByStatus),
          user_game: userGame
            ? (object) => ({
                ...object,
                ...userGame,
              })
            : always(null),
        },
      },
      state,
    ),

  [GAME_USER_REVIEW_UPDATED]: (state, { gameSlug, review }) =>
    evolve(
      {
        [key(gameSlug)]: pipe(
          addKeyIfNotExists('user_review', null),
          evolve({
            user_review: always(review),
          }),
        ),
      },
      state,
    ),

  [GAME_USER_COLLECTIONS_LOADING]: (state, { gameSlug }) =>
    evolve(
      {
        [key(gameSlug)]: pipe(
          assocUserCollections,
          evolve({
            user_collections: always([]),
          }),
        ),
      },
      state,
    ),

  [GAME_USER_COLLECTIONS_LOADED]: (state, { gameSlug, collections }) =>
    evolve(
      {
        [key(gameSlug)]: pipe(
          assocUserCollections,
          evolve({
            user_collections: always(collections),
          }),
        ),
      },
      state,
    ),

  [GAME_USER_COLLECTION_ADDED]: (state, { collectionId, gameSlug }) => {
    if (!gameSlug) {
      return state;
    }

    return evolve(
      {
        [key(gameSlug)]: pipe(
          assocUserCollections,
          evolve({
            user_collections: adjustByProp(
              'id',
              collectionId,
              evolve({
                game_in_collection: T,
              }),
            ),
          }),
        ),
      },
      state,
    );
  },

  [GAME_USER_COLLECTION_REMOVED]: (state, { collectionId, gameSlug }) =>
    evolve(
      {
        [key(gameSlug)]: pipe(
          assocUserCollections,
          evolve({
            user_collections: adjustByProp(
              'id',
              collectionId,
              evolve({
                game_in_collection: F,
              }),
            ),
          }),
        ),
      },
      state,
    ),

  [GAMECARD_COMMENTS_LOAD_SUCCESS]: (state, { gameSlug, results, next, previous, count }, action) =>
    /* eslint-disable no-nested-ternary */
    evolve(
      {
        [key(gameSlug)]: {
          comments: {
            count: always(count),
            next: always(next),
            previous: always(previous),
            results: action.shift
              ? concat(results)
              : action.push
              ? concat(__, results)
              : action.replace
              ? always(results)
              : filter((comm) => comm.parent),
          },
        },
      },
      state,
    ),

  [GAMECARD_COMMENTS_REPLIES_LOAD_SUCCESS]: (state, { gameSlug, comments, next, previous }, action) =>
    evolve(
      {
        [key(gameSlug)]: {
          comments: {
            childrenNext: always(next),
            childrenPrevious: always(previous),
            results: action.shift ? concat(comments) : concat(__, comments),
          },
        },
      },
      state,
    ),

  [GAMECARD_COMMENT_CREATE_SUCCESS]: (state, { gameSlug, comment }) =>
    evolve(
      {
        [key(gameSlug)]: {
          comments: {
            count: inc,
            results: append(comment),
          },
        },
      },
      state,
    ),

  [GAMECARD_COMMENT_EDIT_SUCCESS]: (state, { gameSlug, comment }) =>
    evolve(
      {
        [key(gameSlug)]: {
          comments: {
            count: inc,
            results: adjustByProp('id', comment.id, always(comment)),
          },
        },
      },
      state,
    ),

  [GAMECARD_COMMENT_REMOVE_SUCCESS]: (state, { gameSlug, comment }) =>
    evolve(
      {
        [key(gameSlug)]: {
          comments: {
            count: inc,
            results: reject(propEq('id', comment.id)),
          },
        },
      },
      state,
    ),
});
