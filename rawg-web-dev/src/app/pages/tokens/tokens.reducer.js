import {
  TOKENS_DASHBOARD_LOAD,
  TOKENS_DASHBOARD_LOAD_SUCCESS,
  TOKENS_DASHBOARD_UPDATE,
  TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBING,
  TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBED,
  TOKENS_DASHBOARD_JOINING_ERROR,
  TOKENS_DASHBOARD_JOINING,
  TOKENS_DASHBOARD_JOINING_SUCCESS,
} from './tokens.actions';
import { STATUS_ACTIVE, STATUS_NEW } from './tokens.types';

export const initialState = {
  id: 0,
  start: '',
  end: '',
  achievements: 0,
  percent: 0,
  status: STATUS_ACTIVE,
  loading: false,
  subscribing: false,
  stages: [],
  next: {
    id: 0,
    start: '',
    end: '',
    achievements: 0,
    percent: 0,
    status: STATUS_NEW,
    subscribed: false,
  },
  joined: 0,
  joining: false,
  join_error_text: '',
  join_error_code: undefined,
  last_users: [],
  current_user: {
    karma: 0,
    achievements: 0,
    achievements_gold: 0,
    achievements_silver: 0,
    achievements_bronze: 0,
    position: 0,
    position_yesterday: 0,
  },
};

export default function tokens(state = initialState, action) {
  switch (action.type) {
    case TOKENS_DASHBOARD_LOAD:
      return {
        ...initialState,
        ...state,
        loading: true,
      };

    case TOKENS_DASHBOARD_LOAD_SUCCESS:
      return {
        ...initialState,
        ...state,
        ...action.data,
        loading: false,
      };

    case TOKENS_DASHBOARD_UPDATE:
      return {
        ...state,
        ...action.data,
      };

    case TOKENS_DASHBOARD_JOINING:
      return {
        ...state,
        joining: true,
        join_error_text: '',
        join_error_code: undefined,
      };

    case TOKENS_DASHBOARD_JOINING_ERROR:
      return {
        ...state,
        joining: false,
        join_error_text: action.data.text,
        join_error_code: action.data.code,
      };

    case TOKENS_DASHBOARD_JOINING_SUCCESS:
      return {
        ...state,
        joining: false,
        join_error_text: '',
        join_error_code: undefined,
      };

    case TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBING:
      return {
        ...state,
        subscribing: true,
      };

    case TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBED:
      return {
        ...state,
        next: {
          ...state.next,
          subscribed: true,
        },
        subscribing: false,
      };

    default:
      return state;
  }
}
