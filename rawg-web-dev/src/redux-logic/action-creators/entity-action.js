import get from 'lodash/get';

import { CALL_API } from 'redux-logic/middlewares/api';

function entityAction({ endpoint, dataPath, types, needReload }) {
  return function actionCreator({ id }) {
    return async (dispatch, getState) => {
      const state = getState();
      const data = get(state, `${dataPath}[${id}]`);

      if (data && (data.loading || (needReload && needReload(data)))) {
        return;
      }

      await dispatch({
        id,
        [CALL_API]: {
          types,
          endpoint,
        },
      });
    };
  };
}

export default entityAction;
