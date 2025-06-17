import { denormalize } from 'normalizr';
import get from 'lodash/get';

import Schemas from 'redux-logic/schemas';

const denormalizeArray = (state, dataPath, type, def = []) =>
  denormalize(get(state, dataPath, def), Schemas[type], state.entities);

export default denormalizeArray;
