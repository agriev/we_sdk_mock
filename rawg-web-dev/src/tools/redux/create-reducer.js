import has from 'lodash/has';

function createReducer(initialState, handlers) {
  return function reducer(state = initialState, action) {
    if (has(handlers, action.type)) {
      return handlers[action.type](state, action.data, action);
    }
    return state;
  };
}

export default createReducer;
