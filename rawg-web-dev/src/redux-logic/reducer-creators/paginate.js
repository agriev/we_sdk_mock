/* eslint-disable sonarjs/cognitive-complexity */

import union from 'lodash/union';
import concat from 'lodash/concat';
import has from 'lodash/has';

import env from 'config/env';

const initialPaginationState = {
  items: [],
  count: 0,
  next: null,
  previous: null,
  loading: false,
  loaded: false,
};

const updatePagination = ({ state = initialPaginationState, action, types, map, unionResults }) => {
  const [requestType, successType, failureType] = types;

  switch (action.type) {
    case requestType: {
      const refresh = action.page === 1 && action.reload;
      return {
        ...state,
        items: refresh ? [] : state.items,
        count: refresh ? 0 : state.count,
        next: refresh ? null : state.next,
        previous: refresh ? null : state.previous,
        loaded: refresh ? false : state.loaded,
        loading: true,
      };
    }

    case successType: {
      const items = (() => {
        const resultsArray = action.schema ? action.data.results.result : action.data.results;

        if (action.page === 1 && action.reload) {
          return resultsArray;
        }

        if (unionResults) {
          return action.shift ? union(resultsArray, state.items) : union(state.items, resultsArray);
        }

        return action.shift ? concat(resultsArray, state.items) : concat(state.items, resultsArray);
      })();

      return {
        ...state,
        loading: false,
        loaded: true,
        items: map ? items.map(map) : items,
        count: action.data.count,
        next: action.data.next ? action.page + 1 : null,
        previous: action.data.previous ? action.page - 1 : null,
      };
    }

    case failureType:
      return {
        ...state,
        loading: false,
      };
    default:
      return state;
  }
};

// Creates a reducer managing pagination, given the action types to handle,
// and a function telling how to extract the key from an action.
const paginate = ({ types, mapActionToKey, map, additionalHandlers, unionResults = true }) => {
  if (env.isDev() && (!Array.isArray(types) || types.length !== 3)) {
    throw new Error('Expected types to be an array of three elements.');
  }

  if (!types.every((t) => typeof t === 'string')) {
    throw new Error('Expected types to be strings.');
  }

  const [requestType, successType, failureType] = types;

  return (state = mapActionToKey ? {} : initialPaginationState, action) => {
    const handleAdditional = (stateData) => {
      if (has(additionalHandlers, action.type)) {
        return additionalHandlers[action.type](stateData, action.data, action);
      }

      return stateData;
    };

    switch (action.type) {
      case requestType:
      case successType:
      case failureType:
        if (mapActionToKey) {
          const key = mapActionToKey(action);
          return {
            ...state,
            [key]: handleAdditional(
              updatePagination({
                state: state[key],
                action,
                types,
                map,
                unionResults,
              }),
            ),
          };
        }

        return handleAdditional(
          updatePagination({
            state,
            action,
            types,
            map,
            unionResults,
          }),
        );
      default:
        break;
    }

    return handleAdditional(state);
  };
};

export default paginate;
