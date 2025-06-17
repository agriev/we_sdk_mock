import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import gameType, {
  GAME_STATUS_OWNED,
  GAME_STATUS_PLAYING,
  GAME_STATUS_BEATEN,
  GAME_STATUS_DROPPED,
  GAME_STATUS_YET,
  GAME_ADDED_STATUSES,
} from 'app/pages/game/game.types';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import ownedIcon from 'assets/icons/emoji/owned.png';
import playingIcon from 'assets/icons/emoji/playing.png';
import beatenIcon from 'assets/icons/emoji/beaten.png';
import droppedIcon from 'assets/icons/emoji/dropped.png';
import yetIcon from 'assets/icons/emoji/yet.png';
import tickIcon from 'assets/icons/check.svg';

import './select-category.styl';

const categories = {
  [GAME_STATUS_OWNED]: {
    icon: ownedIcon,
    messageId: 'game_menu_status_owned',
  },
  [GAME_STATUS_PLAYING]: {
    icon: playingIcon,
    messageId: 'game_menu_status_playing',
  },
  [GAME_STATUS_BEATEN]: {
    icon: beatenIcon,
    messageId: 'game_menu_status_beaten',
  },
  [GAME_STATUS_DROPPED]: {
    icon: droppedIcon,
    messageId: 'game_menu_status_dropped',
  },
  [GAME_STATUS_YET]: {
    icon: yetIcon,
    messageId: 'game_menu_status_yet',
  },
};

const propTypes = {
  game: gameType.isRequired,
  onCategoryClick: PropTypes.func.isRequired,
  onRemoveClick: PropTypes.func.isRequired,
};

const SelectCategory = ({ game, onCategoryClick, onRemoveClick }) => (
  <ul className="select-category">
    {GAME_ADDED_STATUSES.map((status) => {
      const category = categories[status];
      const isActive = game.user_game && game.user_game.status === status;
      const buttonClassName = cn('select-category__button', {
        'select-category__button_active': isActive,
      });

      return (
        <li className="select-category__item" key={status}>
          <div className={buttonClassName} onClick={() => onCategoryClick(status)} role="button" tabIndex="0">
            <img className="select-category__icon" src={category.icon} width="24" alt={status} title={status} />
            <div className="select-category__text">
              <span className="select-category__title">
                <SimpleIntlMessage id={`shared.${category.messageId}`} />
                {isActive && (
                  <img
                    className="select-category__active"
                    src={paths.svgImagePath(tickIcon)}
                    width="12"
                    alt="active"
                    title="active"
                  />
                )}
              </span>
              <span className="select-category__description">
                <SimpleIntlMessage id={`shared.${category.messageId}_desc`} />
              </span>
            </div>
          </div>
        </li>
      );
    })}
    <li className="select-category__item">
      <div
        className={cn('select-category__button', 'select-category__button_remove')}
        onClick={onRemoveClick}
        role="button"
        tabIndex="0"
      >
        <SimpleIntlMessage id="shared.game_delete" />
      </div>
    </li>
  </ul>
);

SelectCategory.propTypes = propTypes;

export default SelectCategory;
