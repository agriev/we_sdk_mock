import fetch from 'tools/fetch';
import Schemas from 'redux-logic/schemas';

import { CALL_API } from 'redux-logic/middlewares/api';
import { getDiscoverPageSize } from 'app/pages/discover/discover.actions';

import getCurrentYear from 'tools/dates/current-year';

export const CALENDAR_LOAD = 'CALENDAR_LOAD';
export const CALENDAR_LOAD_SUCCESS = 'CALENDAR_LOAD_SUCCESS';
export const CALENDAR_LOAD_FAIL = 'CALENDAR_LOAD_FAIL';
export const CALENDAR_PLATFORMS_LOAD_SUCCESS = 'CALENDAR_PLATFORMS_LOAD_SUCCESS';

export function loadCalendar({
  page = 1,
  year = getCurrentYear(),
  month: monthArgument,
  platforms,
  ordering = '-released',
  popular = true,
  onlyPrevious = false,
  onlyNext = false,
  pageSize: pageSizeArg,
} = {}) {
  return async (dispatch, getState) => {
    const { currentUser } = getState();
    const date = new Date();
    const month = monthArgument || date.getMonth() + 1;
    const endpoint = `/api/games/calendar/${year}/${month}`;
    const pageSize = pageSizeArg || getDiscoverPageSize({ currentUser });

    const data = {
      ordering,
      popular,
      page,
      page_size: pageSize,
    };

    if (platforms) {
      data.platforms = platforms;
    }

    const types = [CALENDAR_LOAD, CALENDAR_LOAD_SUCCESS, CALENDAR_LOAD_FAIL];

    await dispatch({
      page,
      onlyPrevious,
      onlyNext,
      [CALL_API]: {
        types,
        schema: Schemas.GAME_ARRAY,
        endpoint,
        data,
      },
    });
  };
}

export function loadCalendarPlatforms() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/games/calendar/platforms';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: CALENDAR_PLATFORMS_LOAD_SUCCESS,
        data: res.results,
      });
    });
  };
}
