import PropTypes from 'prop-types';

export const gameType = PropTypes.shape({
  id: PropTypes.number,
  slug: PropTypes.string,
  name: PropTypes.string,
  added: PropTypes.number,
});

export default PropTypes.shape({
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  loading: PropTypes.bool.isRequired,
});
