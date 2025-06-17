import { NOTIFICATIONS_ADD, NOTIFICATIONS_FILTER_BY_FUNC, NOTIFICATIONS_UPDATE_BY_FUNC } from './notifications.actions';

const initialState = [];

export default function notifications(state = initialState, action) {
  switch (action.type) {
    case NOTIFICATIONS_ADD:
      return [...state, ...[action.data]];

    case NOTIFICATIONS_FILTER_BY_FUNC:
      return state.filter(action.func);

    case NOTIFICATIONS_UPDATE_BY_FUNC:
      return state.map(action.func);

    default:
      return state;
  }
}
