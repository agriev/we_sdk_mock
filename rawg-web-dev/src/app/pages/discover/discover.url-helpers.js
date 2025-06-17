import { stringify } from 'qs';

import getPreviousYear from 'tools/dates/previous-year';

const common = 'discover=true';

export const getFilter = (filters) => {
  if (filters) {
    return `&${stringify(filters, { indices: false })}`;
  }

  return '';
};

export const mainUrl = ({ filters, ...rest }) => {
  if (rest.playable) {
    return `/api/games/playable`;
  }

  return `/api/games/lists/main?${common}${getFilter(filters)}`;
};

export const recentUrl = (time) => ({ filters }) => {
  if (time) {
    return `/api/games/lists/recent-games-${time}?${common}${getFilter(filters)}`;
  }

  return `/api/games/lists/recent-games?${common}${getFilter(filters)}`;
};

export const bestYearGamesUrl = ({ filters }) => `/api/games/lists/greatest?${common}${getFilter(filters)}`;

export const lastYearUrl = ({ filters }) =>
  `/api/games/lists/greatest?year=${getPreviousYear()}&${common}${getFilter(filters)}`;

export const bestGamesUrl = ({ filters }) => `/api/games/lists/popular?${common}${getFilter(filters)}`;

export const wishlistUrl = ({ userSlug, filters }) =>
  `/api/users/${userSlug}/games?statuses=toplay&${getFilter(filters)}`;

export const libraryUrl = ({ userSlug, filters }) => `/api/users/${userSlug}/games?${common}${getFilter(filters)}`;

export const friendsUrl = ({ filters }) => `/api/users/current/following/users/games?${common}${getFilter(filters)}`;

export const suggestedUrl = ({ id, filters }) => `/api/games/${id}/suggested?${common}${getFilter(filters)}`;

export const searchUrl = (action) => `/api/search?search=${action.query}`;
