import React from 'react';
import PropTypes from 'prop-types';

import './event-footer.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
};

const defaultProps = {
  className: '',
};

const EventFooter = ({ className, children }) => (
  <div className={['event-footer', className].join(' ')}>{children}</div>
);

EventFooter.propTypes = componentPropertyTypes;
EventFooter.defaultProps = defaultProps;

export default EventFooter;
