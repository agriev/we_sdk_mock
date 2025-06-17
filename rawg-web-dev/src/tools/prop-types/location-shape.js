import PropTypes from 'prop-types';

const locationShape = PropTypes.shape({
  action: PropTypes.string,
  hash: PropTypes.string,
  key: PropTypes.string,
  pathname: PropTypes.string,
  query: PropTypes.object,
  search: PropTypes.string,
  state: PropTypes.object,
});

export default locationShape;
