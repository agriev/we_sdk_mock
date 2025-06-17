/* eslint-disable promise/no-callback-in-promise */

import { normalize } from 'normalizr';
import fetch from 'tools/fetch';

import evolve from 'ramda/src/evolve';

import env from 'config/env';

// Fetches an API response and normalizes the result JSON according to schema.
// This makes every API response have the same shape, regardless of how nested it was.
const callApi = ({ state, endpoint, data, schema }) => {
  const request = fetch(endpoint, { state, data });

  if (schema) {
    return request.then(
      evolve({
        results: (results) => normalize(results, schema),
      }),
    );
  }

  return request;
};

// Action key that carries API call info interpreted by this Redux middleware.
export const CALL_API = 'Call API';

// A Redux middleware that interprets actions with CALL_API info specified.
// Performs the call and promises when such actions are dispatched.
const api = (store) => (next) => (action) => {
  const callAPI = action[CALL_API];
  const state = store.getState();

  if (typeof callAPI === 'undefined') {
    return next(action);
  }

  let { endpoint } = callAPI;
  const { schema, types, data } = callAPI;

  if (env.isDev() && (!Array.isArray(types) || types.length !== 3)) {
    throw new Error('Expected an array of three action types.');
  }

  if (env.isDev() && !types.every((type) => typeof type === 'string')) {
    throw new Error('Expected action types to be strings.');
  }

  if (typeof endpoint === 'function') {
    endpoint = endpoint(action);
  }

  const actionWith = (responseData) => {
    const finalAction = { ...action, ...responseData };
    delete finalAction[CALL_API];
    return finalAction;
  };

  const [requestType, successType, failureType] = types;

  next(actionWith({ type: requestType }));

  return callApi({
    state,
    endpoint,
    schema,
    data,
  }).then(
    (responseData) =>
      next(
        actionWith({
          data: responseData,
          type: successType,
        }),
      ),
    (error) => {
      console.log('error on fetching', error);

      return next(
        actionWith({
          type: failureType,
          error: error.message || 'Something bad happened',
        }),
      );
    },
  );
};

export default api;
