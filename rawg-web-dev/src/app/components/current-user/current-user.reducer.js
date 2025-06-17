import without from 'lodash/without';

import { TOKENS_DASHBOARD_JOINING_SUCCESS } from 'app/pages/tokens/tokens.actions';

import {
  CURRENT_USER_LOAD_SUCCESS,
  CURRENT_USER_UPDATE_SUCCESS,
  CURRENT_USER_LOGOUT,
  CURRENT_USER_DISCONNECT_SUCCESS,
  CURRENT_USER_STEAM_AUTH_SUCCESS,
  CURRENT_USER_UPDATE_RATED_GAMES_PERCENT,
  CURRENT_USER_UPDATE_LOYALTY,
} from './current-user.actions';

export const initialState = {
  id: '',
  username: '',
  full_name: '',
  avatar: '',
  is_active: false,
  connections: [],
  games_count: 0,
  collections_count: 0,
  bio: '',
  settings: {},
  token_program: false,
  steam_id_confirm: false,
  gamer_tag_confirm: false,
  psn_online_id_confirm: false,
  has_confirmed_accounts: false,
  tokens: 0,
  is_staff: false,
  rated_games_percent: 0,
  loyalty: {
    completed_days: 0,
    base_bonus: 0,
    full_bonus: 0,
    hot_streak_bonus: 0,
    hot_streak_days: 0,
    lives: 0,
    saved_days: [],
    can_accept: false,
    logins: [],
  },
};

export default function currentUser(state = initialState, action) {
  switch (action.type) {
    case CURRENT_USER_LOAD_SUCCESS:
    case CURRENT_USER_UPDATE_SUCCESS:
      return {
        ...initialState,
        ...state,
        ...action.data,
      };

    case CURRENT_USER_LOGOUT: {
      // eslint-disable-next-line no-undef
      return structuredClone(initialState);
    }

    case CURRENT_USER_DISCONNECT_SUCCESS:
      return {
        ...state,
        connections: without(state.connections, action.data.provider),
      };

    case TOKENS_DASHBOARD_JOINING_SUCCESS:
      return {
        ...state,
        token_program: true,
      };

    case CURRENT_USER_STEAM_AUTH_SUCCESS:
      return {
        ...state,
        steam_id: action.data,
      };

    case CURRENT_USER_UPDATE_RATED_GAMES_PERCENT:
      return {
        ...state,
        rated_games_percent: action.data.percent,
      };

    case CURRENT_USER_UPDATE_LOYALTY:
      return {
        ...state,
        loyalty: action.data,
      };

    default:
      return state;
  }
}
