import PropTypes from 'prop-types';

export const allGames = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  results: PropTypes.array,
});

export const allCollections = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  results: PropTypes.array,
});

export const allPersons = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  results: PropTypes.array,
});

export const allUsers = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  results: PropTypes.array,
});

export const personalGames = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  results: PropTypes.array,
});

export default PropTypes.shape({
  allGames,
  allCollections,
  allPersons,
  allUsers,
  personalGames,
});
