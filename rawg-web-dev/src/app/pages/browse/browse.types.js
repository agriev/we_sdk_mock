import PropTypes from 'prop-types';

export const gameType = PropTypes.shape({
  id: PropTypes.number,
  slug: PropTypes.string,
  name: PropTypes.string,
  added: PropTypes.number,
});

export const itemType = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
  image: PropTypes.string,
  image_background: PropTypes.string,
  games_count: PropTypes.number,
  games: PropTypes.arrayOf(gameType),
});

export const pagesType = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
  count: PropTypes.number,
  items: PropTypes.arrayOf(itemType),
});

export default PropTypes.shape({
  items: PropTypes.arrayOf(pagesType).isRequired,
  loading: PropTypes.bool.isRequired,
});
