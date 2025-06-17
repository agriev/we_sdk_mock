import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './event-container.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  header: PropTypes.node.isRequired,
  comments: PropTypes.node,
  footer: PropTypes.node,
  children: PropTypes.node,
  colors: PropTypes.arrayOf(PropTypes.string),
  platform: PropTypes.shape({
    slug: PropTypes.string,
  }),
  reactionsList: PropTypes.node,
};

const defaultProps = {
  className: '',
  children: undefined,
  footer: undefined,
  comments: undefined,
  colors: undefined,
  platform: {},
  reactionsList: undefined,
};

const EventContainer = ({ className, header, footer, children, comments, colors, platform, reactionsList }) => {
  const gradient = colors &&
    colors.length && {
      backgroundImage: `linear-gradient(to bottom, ${colors[0]}, ${colors[1]})`,
    };

  const headClasses = cn('event-container__head-wrap', {
    'event-container__head-wrap__rounded': !children,
  });

  return (
    <div
      className={cn(
        'event-container',
        {
          [`event-container__platform event-container__platform-${platform.slug}`]: platform !== 'undefined',
        },
        className,
      )}
      style={gradient}
    >
      <div className={headClasses}>{header}</div>
      {children && <div className="event-container__body-wrap">{children}</div>}
      {comments && <div className="event-container__comments-wrap">{comments}</div>}
      {reactionsList}
      {footer && <div className="event-container__footer-wrap">{footer}</div>}
    </div>
  );
};

EventContainer.propTypes = componentPropertyTypes;

EventContainer.defaultProps = defaultProps;

export default EventContainer;
