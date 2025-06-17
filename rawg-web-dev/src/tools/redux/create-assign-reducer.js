import createReducer from 'tools/redux/create-reducer';

import get from 'lodash/get';
import isNull from 'lodash/isNull';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';

import evolve from 'ramda/src/evolve';
import identity from 'ramda/src/identity';
import T from 'ramda/src/T';

const createAssignReducer = ({
  actions,
  initial = {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  handlers,
  finishData,
}) => {
  const [loadStartAction, loadFinishAction] = actions;

  if (isPlainObject(initial)) {
    return createReducer(initial, {
      [loadStartAction]: evolve({ loading: T }),
      [loadFinishAction]: (state, data, action) => {
        const next = isNull(data.next) || (isNumber(data.next) && data.next > 0) ? data.next : state.next + 1;

        return {
          ...state,
          ...data,
          loading: false,
          next,
          results: action.push
            ? [...get(state, 'results', []), ...get(data, 'results', [])]
            : [...get(data, 'results', [])],
          ...(finishData ? finishData(state, action) : undefined),
        };
      },
      ...handlers,
    });
  }

  if (isArray(initial)) {
    return createReducer(initial, {
      [loadStartAction]: identity,
      [loadFinishAction]: (state, data) => data,
      ...handlers,
    });
  }

  return createReducer(initial, {});
};

export default createAssignReducer;
