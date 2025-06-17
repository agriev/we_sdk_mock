/* eslint-disable no-nested-ternary */

import get from 'lodash/get';

import {
  POST_COMMENTS_ADD_SUCCESS,
  POST_COMMENTS_REPLIES_LOAD_SUCCESS,
  POST_COMMENTS_LOAD_SUCCESS,
  POST_COMMENT_CREATE_SUCCESS,
  // POST_COMMENT_CREATE_FAIL,
  POST_COMMENT_EDIT_SUCCESS,
  // POST_COMMENT_EDIT_FAIL,
  POST_COMMENT_REMOVE_SUCCESS,
  // POST_COMMENT_REMOVE_FAIL,
} from './post-comments.actions';

export const initialState = {};

export default function postComments(state = initialState, action) {
  switch (action.type) {
    case POST_COMMENTS_ADD_SUCCESS: {
      const { post } = action.data;

      return {
        ...state,
        [post.id]: post.comments,
      };
    }

    case POST_COMMENTS_REPLIES_LOAD_SUCCESS: {
      const { post, comments, next, previous } = action.data;

      return {
        ...state,
        [post.id]: {
          ...state[post.id],
          childrenNext: next,
          childrenPrevious: previous,
          results: action.shift ? [...comments, ...state[post.id].results] : [...state[post.id].results, ...comments],
        },
      };
    }

    case POST_COMMENTS_LOAD_SUCCESS: {
      const { post } = action.data;

      return {
        ...state,
        [post.id]: {
          ...state[post.id],
          ...action.data,
          results: action.shift
            ? [...action.data.results, ...state[post.id].results]
            : action.push
            ? [...state[post.id].results, ...action.data.results]
            : [...action.data.results, ...get(state, `${post.id}.results`, []).filter((comm) => comm.parent)],
          loading: false,
        },
      };
    }

    case POST_COMMENT_CREATE_SUCCESS: {
      const { post, comment } = action.data;

      return {
        ...state,
        [post.id]: {
          ...state[post.id],
          count: get(state[post.id], 'count', 0) + 1,
          results: [...get(state[post.id], 'results', []), { ...comment }],
        },
      };
    }

    case POST_COMMENT_EDIT_SUCCESS: {
      const { post, comment } = action.data;
      const existComment = state[post.id].results.find((r) => r.id === comment.id);

      Object.keys(comment).forEach((key) => {
        existComment[key] = comment[key];
      });

      return {
        ...state,
      };
    }

    case POST_COMMENT_REMOVE_SUCCESS: {
      const { post, comment } = action.data;

      return {
        ...state,
        [post.id]: {
          ...state[post.id],
          results: state[post.id].results.filter((r) => r.id !== comment.id),
        },
      };
    }

    default:
      return state;
  }
}
