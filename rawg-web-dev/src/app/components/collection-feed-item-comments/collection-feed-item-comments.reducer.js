/* eslint-disable no-nested-ternary */

import get from 'lodash/get';

import {
  COLLECTION_COMMENTS_ADD_SUCCESS,
  COLLECTION_COMMENTS_REPLIES_LOAD_SUCCESS,
  COLLECTION_COMMENTS_LOAD_SUCCESS,
  COLLECTION_COMMENT_CREATE_SUCCESS,
  // COLLECTION_COMMENT_CREATE_FAIL,
  COLLECTION_COMMENT_EDIT_SUCCESS,
  // COLLECTION_COMMENT_EDIT_FAIL,
  COLLECTION_COMMENT_REMOVE_SUCCESS,
  // COLLECTION_COMMENT_REMOVE_FAIL,
} from './collection-feed-item-comments.actions';

export const initialState = {};

export default function collectionComments(state = initialState, action) {
  switch (action.type) {
    case COLLECTION_COMMENTS_ADD_SUCCESS: {
      const { item } = action.data;
      const childComments = get(state, `[${item.id}].results`, []).filter((comment) => comment.parent);

      return {
        ...state,
        [item.id]: {
          ...item.comments,
          results: [...childComments, ...item.comments.results],
        },
      };
    }

    case COLLECTION_COMMENTS_REPLIES_LOAD_SUCCESS: {
      const { item, comments, next, previous } = action.data;

      return {
        ...state,
        [item.id]: {
          ...state[item.id],
          childrenNext: next,
          childrenPrevious: previous,
          results: action.shift
            ? [...comments, ...state[item.id].results]
            : [...get(state, `${item.id}.results`, []), ...comments],
        },
      };
    }

    case COLLECTION_COMMENTS_LOAD_SUCCESS: {
      const { item } = action.data;

      return {
        ...state,
        [item.id]: {
          ...state[item.id],
          ...action.data,
          results: action.shift
            ? [...action.data.results, ...state[item.id].results]
            : action.push
            ? [...state[item.id].results, ...action.data.results]
            : [...action.data.results],
          loading: false,
        },
      };
    }

    case COLLECTION_COMMENT_CREATE_SUCCESS: {
      const { item, comment } = action.data;

      return {
        ...state,
        [item.id]: {
          ...state[item.id],
          count: get(state, `[${item.id}].count`, 0) + 1,
          results: [...get(state, `[${item.id}].results`, []), { ...comment }],
        },
      };
    }

    case COLLECTION_COMMENT_EDIT_SUCCESS: {
      const { item, comment } = action.data;
      const existComment = state[item.id].results.find((r) => r.id === comment.id);

      Object.keys(comment).forEach((key) => {
        existComment[key] = comment[key];
      });

      return {
        ...state,
      };
    }

    case COLLECTION_COMMENT_REMOVE_SUCCESS: {
      const { item, comment } = action.data;

      return {
        ...state,
        [item.id]: {
          ...state[item.id],
          results: state[item.id].results.filter((r) => r.id !== comment.id),
        },
      };
    }

    default:
      return state;
  }
}
