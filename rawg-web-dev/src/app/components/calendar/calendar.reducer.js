import urlParse from 'url-parse';

import union from 'lodash/union';

import createReducer from 'tools/redux/create-reducer';

import {
  CALENDAR_LOAD,
  CALENDAR_LOAD_SUCCESS,
  CALENDAR_LOAD_FAIL,
  CALENDAR_PLATFORMS_LOAD_SUCCESS,
} from './calendar.actions';

const calendarReducer = createReducer(
  {
    count: 0,
    next: 1,
    previous: null,
    loading: false,
    loaded: false,
    items: [],
    months: [],
    platforms: [],
  },
  {
    [CALENDAR_LOAD]: (state, _, { page }) => ({
      ...state,
      items: page > 1 ? state.items : [],
      next: page === 1 ? null : page,
      count: page === 1 ? 0 : state.count,
      loading: true,
      loaded: false,
    }),
    [CALENDAR_LOAD_SUCCESS]: (state, data, action) => {
      const nextUrl = data.next && urlParse(data.next, true);
      const items = (() => {
        if (action.page === 1) {
          return data.results.result;
        }

        return action.shift ? union(data.results.result, state.items) : union(state.items, data.results.result);
      })();

      return {
        ...state,
        items,
        loading: false,
        loaded: true,
        months: data.months,
        count: data.count,
        next: action.onlyPrevious ? state.next : (nextUrl && +nextUrl.query.page) || null,
      };
    },
    [CALENDAR_LOAD_FAIL]: (state) => ({
      ...state,
      loading: false,
      loaded: false,
    }),
    [CALENDAR_PLATFORMS_LOAD_SUCCESS]: (state, data) => ({
      ...state,
      platforms: data,
    }),
  },
);

export default calendarReducer;
