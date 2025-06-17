import PropTypes from 'prop-types';

export const platforms = PropTypes.array;
export const stores = PropTypes.array;
export const genres = PropTypes.array;
export const ratings = PropTypes.array;
export const years = PropTypes.array;
export const games = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.number,
  results: PropTypes.array,
  loading: PropTypes.bool,
});
export const loading = PropTypes.bool;

export default PropTypes.shape({
  platforms,
  stores,
  genres,
  ratings,
  years,
  games,
  loading,
});
