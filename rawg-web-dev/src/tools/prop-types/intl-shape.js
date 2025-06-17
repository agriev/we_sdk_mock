import PropTypes from 'prop-types';

const intlShape = PropTypes.shape({
  formatMessage: PropTypes.func.isRequired,
  formatRelativeTime: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
});

export default intlShape;
