import isPlainObject from 'lodash/isPlainObject';
import isFunction from 'lodash/isFunction';
import noop from 'lodash/noop';
import get from 'lodash/get';

import { CALL_API } from 'redux-logic/middlewares/api';
import { setPage } from '../../tools/urls/url-modificators';

function paginatedAction({
  pageSize: pageSizeArg,
  endpoint,
  dataPath,
  types,
  schema,
  onlyAuthored,
  onSuccess = noop,
  reload = true,
}) {
  return function actionCreator({ id, page = 1, data: dataArgument, ...rest } = {}) {
    return async (dispatch, getState) => {
      const state = getState();
      const current = get(state, id ? `${dataPath}[${id}]` : dataPath);
      const pageSize = isFunction(pageSizeArg) ? pageSizeArg(state) : pageSizeArg;

      const data = {
        ...dataArgument,
        page_size: pageSize,
        page,
      };

      // Этот запрос нужно выполнять только для авторизованных пользователей.
      if (onlyAuthored && !state.app.token) {
        return;
      }

      if (isPlainObject(current)) {
        const itemsLength = current.items.length;
        const needLoad = Math.min(current.count, page * pageSize);
        const itemsNotNeedLoad = !reload && needLoad > 0 && itemsLength >= needLoad;

        if (current.loading || itemsNotNeedLoad) {
          return;
        }
      }

      const actionResult = await dispatch({
        id,
        page,
        reload,
        schema,
        ...rest,
        [CALL_API]: {
          types,
          schema,
          endpoint,
          data,
        },
      });

      setPage(page);

      await onSuccess({
        dispatch,
        getState,
        data: actionResult.data,
      });
    };
  };
}

export default paginatedAction;
