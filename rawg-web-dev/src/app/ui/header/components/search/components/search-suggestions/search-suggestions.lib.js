import values from 'lodash/values';

import paths from 'config/paths';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

export const getSuggestionsFromState = (state) => {
  const games = {
    ...state.search.allGames,
    results: denormalizeGamesArr(state, 'search.allGames.results'),
  };

  const library = {
    ...state.search.personalGames,
    results: denormalizeGamesArr(state, 'search.personalGames.results'),
  };

  return {
    games,
    library,
    collections: state.search.allCollections,
    persons: state.search.allPersons,
    users: state.search.allUsers,
  };
};

const doWithState = (action) => (state) => action(values(getSuggestionsFromState(state)));

const getSuggestionsCount = (suggestionsCollections) =>
  suggestionsCollections.reduce((total, collection) => total + collection.count, 0);

const getSuggestionsLoading = (suggestionsCollections) =>
  suggestionsCollections.reduce((loading, collection) => loading || collection.loading, false);

export const getSuggestionsCountFromState = doWithState(getSuggestionsCount);

export const getSuggestionsLoadingFromState = doWithState(getSuggestionsLoading);

export const getSearchLink = (query) => paths.search(query);

export const getViewAllResultsLink = (query) => getSearchLink(query);
