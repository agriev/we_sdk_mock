import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import './show-more-button.styl';

import gameType from 'app/pages/game/game.types';
import paths from 'config/paths';

const getShowMorePath = (game) => {
  if (game.suggestions_count > 0) {
    return paths.discoverSuggestions(game.slug);
  }

  return undefined;
};

const propTypes = {
  game: gameType,
  path: PropTypes.string,
  text: PropTypes.node,
  tagProps: PropTypes.shape(),
  className: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node,
  grayIcon: PropTypes.bool,
  showIcon: PropTypes.bool,
};

const defaultProps = {
  game: undefined,
  path: undefined,
  text: <FormattedMessage id="games.show_more" />,
  tagProps: undefined,
  className: undefined,
  onClick: undefined,
  children: undefined,
  grayIcon: false,
  showIcon: true,
};

const ShowMoreButton = ({
  game,
  path: pathArgument,
  onClick,
  text,
  tagProps,
  className,
  grayIcon,
  showIcon,
  children,
}) => {
  const path = !onClick ? pathArgument || getShowMorePath(game) : undefined;

  if (!path && !onClick) {
    return null;
  }

  const Tag = path ? Link : 'div';

  return (
    <Tag onClick={onClick} className={cn('show-more-button', className)} to={path} {...tagProps}>
      {children}
      {!children && (
        <>
          <span className="show-more-button__title">{text}</span>
          {showIcon && <div className={cn('show-more-button__icon', { gray: grayIcon })} />}
        </>
      )}
    </Tag>
  );
};

ShowMoreButton.propTypes = propTypes;
ShowMoreButton.defaultProps = defaultProps;

export default ShowMoreButton;
