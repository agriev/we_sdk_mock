/* eslint-disable import/prefer-default-export */
import {
  findAllGames,
  findPersonalGames,
  findAllUsers,
  findAllCollections,
  findAllPersons,
} from 'app/pages/search/search.actions';

export const getSuggestions = (value) => (dispatch) =>
  Promise.all([
    dispatch(findAllUsers(value, 1)),
    dispatch(findPersonalGames(value, 1)),
    dispatch(findAllGames(value, 1)),
    dispatch(findAllCollections(value, 1)),
    dispatch(findAllPersons(value, 1)),
  ]);
