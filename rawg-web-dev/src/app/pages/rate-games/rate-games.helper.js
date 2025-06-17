import findIndex from 'lodash/findIndex';

import storage from 'tools/storage';

const STORAGE_KEY = 'rated-games';

function hasNoGame(games, game) {
  return findIndex(games, game) === -1;
}

export function getRatedGames() {
  return storage.get(STORAGE_KEY) || [];
}

export function saveRating(item) {
  const games = getRatedGames();

  if (hasNoGame(games, item)) {
    storage.set(STORAGE_KEY, [...games, item]);
  }
}

export function clearRatedGames() {
  storage.remove(STORAGE_KEY);
}
