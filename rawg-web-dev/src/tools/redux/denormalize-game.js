import { denormalize } from 'normalizr';

import Schemas from 'redux-logic/schemas';

const denormalizeGame = (state) => ({
  ...state.game,
  ...denormalize(state.game.slug, Schemas.GAME, state.entities),
});

export default denormalizeGame;
