import PropTypes from 'prop-types';

export const valueProps = PropTypes.oneOfType([PropTypes.string, PropTypes.object]);

export const deletedValueProps = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

export const typeProps = PropTypes.oneOf(['strings', 'objects']);
