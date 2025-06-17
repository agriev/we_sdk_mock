import { push } from 'react-router-redux';

import fetch from 'tools/fetch';
import paths from 'config/paths';
import Error301 from 'interfaces/error-301';
import { CALL_API } from 'redux-logic/middlewares/api';
import Schemas from 'redux-logic/schemas';
import { getDiscoverPageSize } from 'app/pages/discover/discover.actions';
import paginatedAction from 'redux-logic/action-creators/paginated-action';

import { getFilter } from 'app/pages/discover/discover.url-helpers';

export const PERSON_LOAD = 'PERSON_LOAD';
export const PERSON_LOAD_SUCCESS = 'PERSON_LOAD_SUCCESS';

export const PERSON_GAMES_LOAD = 'PERSON_GAMES_LOAD';
export const PERSON_GAMES_LOAD_SUCCESS = 'PERSON_GAMES_LOAD_SUCCESS';
export const PERSON_GAMES_LOAD_FAIL = 'PERSON_GAMES_LOAD_FAIL';

export const PERSON_GAMES_KNOWN_FOR_LOAD = 'PERSON_GAMES_KNOWN_FOR_LOAD';
export const PERSON_GAMES_KNOWN_FOR_LOAD_SUCCESS = 'PERSON_GAMES_KNOWN_FOR_LOAD_SUCCESS';
export const PERSON_GAMES_KNOWN_FOR_LOAD_FAIL = 'PERSON_GAMES_KNOWN_FOR_LOAD_FAIL';

export const GAMES_KNOWN_FOR_COUNT = 10;

export function loadPerson(id, redirectPathFunc = paths.creator) {
  return async (dispatch, getState) => {
    const state = getState();
    const personUri = `/api/creators/${encodeURIComponent(id)}`;

    if (state.person.slug === id) {
      return true;
    }

    dispatch({
      type: PERSON_LOAD,
    });

    const person = await fetch(personUri, {
      method: 'get',
      state,
    });

    if (person.redirect) {
      const url = redirectPathFunc(person.slug);

      if (typeof window === 'undefined') {
        throw new Error301(url);
      } else {
        dispatch(push(url));

        return false;
      }
    } else {
      return dispatch({
        type: PERSON_LOAD_SUCCESS,
        data: {
          ...person,
        },
      });
    }
  };
}

export const loadPersonGames = paginatedAction({
  pageSize: getDiscoverPageSize,
  endpoint: ({ id, filters }) => `/api/games?creators=${id}&ordering=-released&comments=true${getFilter(filters)}`,
  dataPath: 'persons.games',
  types: [PERSON_GAMES_LOAD, PERSON_GAMES_LOAD_SUCCESS, PERSON_GAMES_LOAD_FAIL],
  schema: Schemas.GAME_ARRAY,
});

export function loadPersonGamesKnownFor(id, count = GAMES_KNOWN_FOR_COUNT) {
  return async (dispatch) => {
    const endpoint = `/api/games?creators=${id}&ordering=-added&page_size=${count}`;
    const types = [PERSON_GAMES_KNOWN_FOR_LOAD, PERSON_GAMES_KNOWN_FOR_LOAD_SUCCESS, PERSON_GAMES_KNOWN_FOR_LOAD_FAIL];

    await dispatch({
      id,
      reload: false,
      [CALL_API]: {
        types,
        schema: Schemas.GAME_ARRAY,
        endpoint,
      },
    });
  };
}
