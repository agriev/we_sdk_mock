/* eslint-disable import/prefer-default-export */

import entityAction from 'redux-logic/action-creators/entity-action';

export const PROGRAM_LOAD_START = 'PROGRAM_LOAD_START';
export const PROGRAM_LOAD_FINISH = 'PROGRAM_LOAD_FINISH';
export const PROGRAM_LOAD_FAILED = 'PROGRAM_LOAD_FAILED';

export const loadSoftware = entityAction({
  needReload: (data) => !!data.name,
  endpoint: (action) => `/api/software/${action.id}`,
  dataPath: 'programs',
  types: [PROGRAM_LOAD_START, PROGRAM_LOAD_FINISH, PROGRAM_LOAD_FAILED],
});
