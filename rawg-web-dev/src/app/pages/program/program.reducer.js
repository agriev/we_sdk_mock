import entities from 'redux-logic/reducer-creators/entities';

import { PROGRAM_LOAD_START, PROGRAM_LOAD_FINISH, PROGRAM_LOAD_FAILED } from 'app/pages/program/program.actions';

const programReducer = entities({
  mapActionToKey: (action) => action.id,
  types: [PROGRAM_LOAD_START, PROGRAM_LOAD_FINISH, PROGRAM_LOAD_FAILED],
});

export default programReducer;
