import has from 'lodash/has';

import env from 'config/env';

const defaultInitialState = {
  loading: false,
};

// Creates a reducer managing pagination, given the action types to handle,
// and a function telling how to extract the key from an action.
const entities = ({ types, mapActionToKey, initialState, additionalHandlers }) => {
  if (env.isDev() && (!Array.isArray(types) || types.length !== 3)) {
    throw new Error('Expected types to be an array of three elements.');
  }

  if (!types.every((t) => typeof t === 'string')) {
    throw new Error('Expected types to be strings.');
  }

  const [requestType, successType, failureType] = types;

  const updateEntity = (state = initialState || defaultInitialState, action) => {
    switch (action.type) {
      case requestType:
        return {
          ...state,
          loading: true,
        };
      case successType:
        return {
          ...state,
          ...action.data,
          loading: false,
        };
      case failureType:
        return {
          ...state,
          loading: false,
        };
      default:
        return state;
    }
  };

  return (state = mapActionToKey ? {} : initialState || defaultInitialState, action) => {
    switch (action.type) {
      case requestType:
      case successType:
      case failureType:
        if (mapActionToKey) {
          const key = mapActionToKey(action);
          return {
            ...state,
            [key]: updateEntity(state[key], action),
          };
        }

        return updateEntity(state, action);
      default:
        break;
    }

    if (has(additionalHandlers, action.type)) {
      return additionalHandlers[action.type](state, action.data, action);
    }

    return state;
  };
};

export default entities;
