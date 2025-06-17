import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './download-button.styl';

import gameType from 'app/pages/game/game.types';
import paths from 'config/paths';
import HiddenLink from 'app/ui/hidden-link';

const getShowMorePath = (game) => {
  if (game.suggestions_count > 0) {
    return paths.discoverSuggestions(game.slug);
  }

  return undefined;
};

const propTypes = {
  game: gameType,
  path: PropTypes.string,
  text: PropTypes.string,
  linkProps: PropTypes.shape(),
};

const defaultProps = {
  game: undefined,
  path: undefined,
  text: 'games.show_more',
  linkProps: undefined,
};

const DownloadButton = ({ game, path: pathArgument, text, linkProps }) => {
  const path = pathArgument || getShowMorePath(game);

  if (!path) {
    return null;
  }

  return (
    <div className="download-button">
      <div className="download-button__border" />
      <HiddenLink className={cn('download-button__link')} to={path} {...linkProps}>
        <SimpleIntlMessage className="download-button__title" id={text} />
      </HiddenLink>
    </div>
  );
};

DownloadButton.propTypes = propTypes;
DownloadButton.defaultProps = defaultProps;

export default DownloadButton;
