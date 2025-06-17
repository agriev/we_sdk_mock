import { stringify } from 'qs';
import compactObject from 'tools/compact-object';

import profileGamesStorage from 'app/pages/profile/profile-games/profile-games.storage';

export function getInitialStatus(id, intl) {
  return {
    id,
    value: intl.formatMessage({ id: `shared.game_menu_status_${id}` }),
    active: false,
  };
}

export function getInitialStateStatuses(ids, intl) {
  return ids.map((id) => getInitialStatus(id, intl));
}

export const getOpenedCategories = ({ isCurrentUser: isCurrentUserArg }) =>
  isCurrentUserArg ? profileGamesStorage.get() : ['owned', 'playing'];

export const isCurrentUser = (user, profile) => user.id === profile.user.id;

export function prepareQuery(filter, search) {
  return stringify(
    compactObject({
      filter: filter ? `${encodeURIComponent(JSON.stringify(filter))}` : '',
      search,
    }),
  );
}

export default {
  getInitialStateStatuses,
  getOpenedCategories,
  isCurrentUser,
  prepareQuery,
};
