/* eslint-disable no-nested-ternary */

import get from 'lodash/get';

import {
  REVIEW_COMMENTS_ADD_SUCCESS,
  REVIEW_COMMENTS_REPLIES_LOAD_SUCCESS,
  REVIEW_COMMENTS_LOAD_SUCCESS,
  REVIEW_COMMENT_CREATE_SUCCESS,
  // REVIEW_COMMENT_CREATE_FAIL,
  REVIEW_COMMENT_EDIT_SUCCESS,
  // REVIEW_COMMENT_EDIT_FAIL,
  REVIEW_COMMENT_REMOVE_SUCCESS,
  // REVIEW_COMMENT_REMOVE_FAIL,
} from './review-comments.actions';

export const initialState = {};

export default function reviewComments(state = initialState, action) {
  switch (action.type) {
    case REVIEW_COMMENTS_ADD_SUCCESS: {
      const { review } = action.data;

      return {
        ...state,
        [review.id]: review.comments,
      };
    }

    case REVIEW_COMMENTS_REPLIES_LOAD_SUCCESS: {
      const { review, comments, next, previous } = action.data;

      return {
        ...state,
        [review.id]: {
          ...state[review.id],
          childrenNext: next,
          childrenPrevious: previous,
          results: action.shift
            ? [...comments, ...state[review.id].results]
            : [...state[review.id].results, ...comments],
        },
      };
    }

    case REVIEW_COMMENTS_LOAD_SUCCESS: {
      const { review } = action.data;

      return {
        ...state,
        [review.id]: {
          ...state[review.id],
          ...action.data,
          results: action.shift
            ? [...action.data.results, ...state[review.id].results]
            : action.push
            ? [...state[review.id].results, ...action.data.results]
            : action.replace
            ? [...action.data.results]
            : [...action.data.results, ...get(state, `${review.id}.results`, []).filter((comm) => comm.parent)],
          loading: false,
        },
      };
    }

    case REVIEW_COMMENT_CREATE_SUCCESS: {
      const { review, comment } = action.data;
      return {
        ...state,
        [review.id]: {
          ...state[review.id],
          count: get(state[review.id], 'count', 0) + 1,
          results: [...get(state[review.id], 'results', []), { ...comment }],
        },
      };
    }

    case REVIEW_COMMENT_EDIT_SUCCESS: {
      const { review, comment } = action.data;

      const existComment = state[review.id].results.find((r) => r.id === comment.id);

      Object.keys(comment).forEach((key) => {
        existComment[key] = comment[key];
      });

      return {
        ...state,
      };
    }

    case REVIEW_COMMENT_REMOVE_SUCCESS: {
      const { review, comment } = action.data;

      return {
        ...state,
        [review.id]: {
          ...state[review.id],
          results: state[review.id].results.filter((r) => r.id !== comment.id),
        },
      };
    }

    default:
      return state;
  }
}
