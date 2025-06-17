import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import noop from 'lodash/noop';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import gameType from 'app/pages/game/game.types';

import RateButton from '../rate-button';
import { buttonsData } from '../../rate-card.helper';

import './rate-buttons-list.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  changeRating: PropTypes.func.isRequired,
  game: gameType.isRequired,
  ratingEvent: PropTypes.number,
  isActive: PropTypes.bool.isRequired,
  kind: PropTypes.oneOf(['light', 'dark']),
};

const defaultProps = {
  className: '',
  ratingEvent: 0,
  kind: 'light',
};
class RateButtonsList extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);
    this.state = {};
    this.timeout = null;
  }

  handleButtonClick = (id) => {
    const { changeRating, game } = this.props;

    if (this.timeout === null) {
      this.timeout = setTimeout(() => {
        this.timeout = null;
        changeRating({ rating: id, game });
      }, 300);
    }
  };

  render() {
    const { className, ratingEvent, isActive, kind } = this.props;

    return (
      <div className={cn('rate-buttons-list', `rate-buttons-list_${kind}`, className)}>
        {kind === 'light' && (
          <div className="rate-buttons-list__title">
            <SimpleIntlMessage id="rate_games.rate" />
          </div>
        )}
        <div className="rate-buttons-list__wrap">
          {buttonsData.map((button) => (
            <RateButton
              handleButtonClick={isActive ? this.handleButtonClick : noop}
              icon={button.icon}
              label={button.label}
              type={button.type}
              key={button.type}
              ratingID={button.id}
              isRated={button.id === ratingEvent}
              isActive={isActive}
              kind={kind}
            />
          ))}
        </div>
      </div>
    );
  }
}

RateButtonsList.defaultProps = defaultProps;

export default RateButtonsList;
