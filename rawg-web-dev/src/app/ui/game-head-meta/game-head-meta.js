import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import isArray from 'lodash/isArray';

import './game-head-meta.styl';

import Time from 'app/ui/time';
import appHelper from 'app/pages/app/app.helper';
import Platforms from 'app/ui/platforms';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import { appSizeType } from 'app/pages/app/app.types';
import {
  released as gameReleasedType,
  platforms as gamePlatformsType,
  parent_platforms as gameParentPlatformsType,
  playtime as gamePlaytimeType,
} from 'app/pages/game/game.types';

const propTypes = {
  appSize: appSizeType.isRequired,
  released: gameReleasedType,
  platforms: gamePlatformsType,
  parentPlatforms: gameParentPlatformsType,
  playtime: gamePlaytimeType,
  onRight: PropTypes.node,
  isSubpage: PropTypes.bool,
};

const defaultProps = {
  released: undefined,
  platforms: undefined,
  parentPlatforms: undefined,
  playtime: undefined,
  onRight: undefined,
  isSubpage: false,
};

const GameHeadMeta = ({ appSize, released, platforms, parentPlatforms, playtime, onRight, isSubpage }) => {
  const [showReleaseDate, setShowReleaseDate] = useState(false);

  useEffect(() => {
    // Дату релиза нужно показывать только с включенным джс во имя сео
    if (released && !isSubpage) {
      setShowReleaseDate(true);
    }
  }, []);

  return (
    <div className="game__head-meta">
      {showReleaseDate && released && (
        <div className="game__meta-date">
          <Time
            date={released}
            format={{
              timeZone: 'UTC',
            }}
          />
        </div>
      )}
      {isArray(platforms) && platforms.length > 0 && (
        <Platforms
          platforms={platforms}
          parentPlatforms={parentPlatforms}
          size={appHelper.isDesktopSize(appSize) ? 'big' : 'medium'}
          icons
          parents
        />
      )}
      {!isSubpage && playtime > 0 && (
        <div className="game__meta-playtime">
          <SimpleIntlMessage id="game.playtime" values={{ playtime }} />
        </div>
      )}
      {onRight && <div className="game__meta__right-elements">{onRight}</div>}
    </div>
  );
};

GameHeadMeta.propTypes = propTypes;

GameHeadMeta.defaultProps = defaultProps;

export default GameHeadMeta;
