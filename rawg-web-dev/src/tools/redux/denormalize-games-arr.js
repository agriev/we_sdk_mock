import { denormalize } from 'normalizr';
import get from 'lodash/get';

import Schemas from 'redux-logic/schemas';

const denormalizeGamesArray = (state, dataPath, def = []) =>
  denormalize(get(state, dataPath, def), Schemas.GAME_ARRAY, state.entities);

export default denormalizeGamesArray;
