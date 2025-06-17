import React from 'react';
import PropTypes from 'prop-types';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import ToggleButton from 'app/ui/toggle-button';

import gameType from 'app/pages/game/game.types';

import './select-platform.styl';

const propTypes = {
  game: gameType.isRequired,
  handlePlatformsChange: PropTypes.func.isRequired,
  disablePlaformsChange: PropTypes.func.isRequired,
};

const defaultProps = {};

const MAIN_PLATFORMS = ['PC', 'Playstation 4', 'PlayStation 4', 'Xbox', 'Xbox One', 'iOS', 'Nintendo Switch'];

const SelectPlatform = ({ game, handlePlatformsChange, disablePlaformsChange }) => {
  const platforms = game.platforms.map((platform) => platform.platform);
  const isMain = (name) => MAIN_PLATFORMS.includes(name);
  const sortedPlatforms = platforms.sort((p1, p2) => {
    if (!isMain(p1.name) && isMain(p2.name)) {
      return 1;
    }

    if ((isMain(p1.name) && isMain(p2.name)) || (!isMain(p1.name) && !isMain(p2.name))) {
      return 0;
    }

    return -1;
  });

  return (
    <div className="select-platform">
      <div className="select-platform__header">
        <SimpleIntlMessage id="shared.game_menu_platform_select" />
        <span className="select-platform__skip" onClick={() => handlePlatformsChange(null)} role="button" tabIndex={0}>
          <SimpleIntlMessage id="shared.game_menu_platform_skip" />
        </span>
      </div>
      <div className="select-platform__list">
        {sortedPlatforms.map((platform) => (
          <div
            key={platform.id}
            className={`select-platform__item select-platform__item_${platform.slug}`}
            onClick={() => handlePlatformsChange(platform.id)}
            role="button"
            tabIndex={0}
          >
            {platform.name}
          </div>
        ))}
      </div>
      <div className="select-platform__footer">
        <div className="select-platform__footer-text">
          <div className="select-platform__footer-title">
            <SimpleIntlMessage id="shared.game_menu_platform_disable" />
          </div>
          <SimpleIntlMessage id="shared.game_menu_platform_disable_text" />
        </div>
        <ToggleButton onChange={disablePlaformsChange} className="select-platform__toggle" />
      </div>
    </div>
  );
};

SelectPlatform.propTypes = propTypes;
SelectPlatform.defaultProps = defaultProps;

export default SelectPlatform;
