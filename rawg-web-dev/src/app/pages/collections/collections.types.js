import PropTypes from 'prop-types';

export const collectionsListTypes = PropTypes.shape({
  results: PropTypes.array.isRequired,
  count: PropTypes.number.isRequired,
  next: PropTypes.number,
  previous: PropTypes.number,
  loading: PropTypes.bool,
});

export default PropTypes.shape({
  all: collectionsListTypes,
  popular: collectionsListTypes,
});
