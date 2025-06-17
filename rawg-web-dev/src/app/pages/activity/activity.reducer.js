/* eslint-disable sonarjs/cognitive-complexity */

import { REVIEW_REMOVED } from 'app/components/review-card/review-card.actions';
import { POST_REMOVED } from 'app/components/post-card/post-card.actions';

import {
  ACTIVITY_NOTIFICATIONS_LOAD,
  ACTIVITY_NOTIFICATIONS_LOAD_SUCCESS,
  ACTIVITY_FOLLOW_UNFOLLOW_USER,
  ACTIVITY_FOLLOW_USER_SUCCESS,
  ACTIVITY_UNFOLLOW_USER_SUCCESS,
  ACTIVITY_SIMILAR_LOAD,
  ACTIVITY_SIMILAR_LOAD_SUCCESS,
} from './activity.actions';

export const initialState = {
  similar: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  notifications: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  emoji: {
    results: [],
  },
};

export default function feed(state = initialState, action) {
  switch (action.type) {
    case ACTIVITY_SIMILAR_LOAD:
      return {
        ...state,
        similar: {
          ...state.similar,
          loading: true,
        },
      };

    case ACTIVITY_SIMILAR_LOAD_SUCCESS:
      return {
        ...state,
        similar: {
          ...state.similar,
          ...action.data,
          results: action.push ? [...state.similar.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case ACTIVITY_NOTIFICATIONS_LOAD:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          loading: true,
        },
      };

    case ACTIVITY_NOTIFICATIONS_LOAD_SUCCESS:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          ...action.data,
          results: action.push
            ? [...state.notifications.results, ...action.data.results.result]
            : [...action.data.results.result],
          loading: false,
        },
      };

    case REVIEW_REMOVED:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          results: state.notifications.results.filter(
            (r) => !(r.action === 'added_review' && r.reviews.results[0].id === action.data.review.id),
          ),
        },
      };

    case POST_REMOVED: {
      const filterResults = (r) =>
        !(r.action === 'added_discussion' && r.discussions.results[0].id === action.data.post.id);

      return {
        ...state,
        notifications: {
          ...state.notifications,
          results: state.notifications.results.filter(filterResults),
        },
      };
    }

    case ACTIVITY_FOLLOW_UNFOLLOW_USER: {
      const mapUsers = (user) =>
        user.id === action.data
          ? {
              ...user,
              follow_loading: true,
            }
          : user;

      return {
        ...state,
        similar: {
          ...state.similar,
          results: state.similar.results.map(mapUsers),
        },
      };
    }

    case ACTIVITY_FOLLOW_USER_SUCCESS: {
      const mapUsersFollowing = (user) =>
        user.id === action.data
          ? {
              ...user,
              follow_loading: false,
              following: true,
              followers_count: user.followers_count + 1,
            }
          : user;

      return {
        ...state,
        similar: {
          ...state.similar,
          results: state.similar.results.map(mapUsersFollowing),
        },
      };
    }

    case ACTIVITY_UNFOLLOW_USER_SUCCESS: {
      const mapUsersNoFollow = (user) =>
        user.id === action.data
          ? {
              ...user,
              follow_loading: false,
              following: false,
              followers_count: user.followers_count - 1,
            }
          : user;

      return {
        ...state,
        similar: {
          ...state.similar,
          results: state.similar.results.map(mapUsersNoFollow),
        },
      };
    }

    default:
      return state;
  }
}
