import getLoadingConsts from 'tools/redux/get-loading-consts';
import paginatedAction from 'redux-logic/action-creators/paginated-action';

export const LEADERBOARD_USERS = getLoadingConsts('LEADERBOARD_USERS');

export const loadLeaderboard = paginatedAction({
  pageSize: 50,
  endpoint: '/api/leaderboard',
  dataPath: 'leaderboard.users',
  types: LEADERBOARD_USERS.array,
});
