import cn from 'classnames';
import PropTypes from 'prop-types';

import React from 'react';
import SVGInline from 'react-svg-inline';

import './not-supported-banner.styl';

import { isAdded } from 'app/components/game-menu-collections/game-menu.helper';
import IconAlert from './assets/alert.svg';

const NotSupportedBanner = ({ game, onGameUpdate }) => {
  const gameAdded = isAdded(game.user_game);

  return (
    <div className={cn('not-supported-banner', gameAdded && 'not-supported-banner--added')}>
      <SVGInline svg={IconAlert} />

      <div className="not-supported-banner__body">
        Игра не оптимизирована под ваше устройство.
        {!gameAdded && (
          <div onClick={onGameUpdate} className="not-supported-banner__link" role="button" tabIndex={0}>
            Добавить в мои игры
          </div>
        )}
      </div>
    </div>
  );
};

NotSupportedBanner.propTypes = {
  onGameUpdate: PropTypes.func,
  game: PropTypes.object,
};

export default NotSupportedBanner;
