import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import cn from 'classnames';

import memoizeOne from 'memoize-one';

import paths from 'config/paths';
import resize from 'tools/img/resize';
import appHelper from 'app/pages/app/app.helper';
import gameType from 'app/pages/game/game.types';

import RateButtonsList from './components/rate-buttons-list';

import './rate-card.styl';

const linearGradient = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), #202020 60%)';
const backgroundConfig = 'center / cover no-repeat';

const getCoverStyle = memoizeOne(({ backgroundImage, size }) => {
  const resizeImage = appHelper.isPhoneSize({ size }) ? resize(1280) : resize(600);
  const image = resizeImage(backgroundImage);

  if (backgroundImage) {
    if (appHelper.isPhoneSize({ size })) {
      return {
        background: `${linearGradient}, url('${image}') ${backgroundConfig}`,
      };
    }

    return {
      background: `url('${image}') ${backgroundConfig}`,
    };
  }

  return undefined;
});

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.string.isRequired,
  game: gameType.isRequired,
  changeRating: PropTypes.func,
  ratingEvent: PropTypes.number,
  isActive: PropTypes.bool.isRequired,
  isRemoved: PropTypes.bool,
};

const defaultProps = {
  className: '',
  changeRating: () => {},
  ratingEvent: 0,
  isRemoved: false,
};

@connect((state) => ({
  size: state.app.size,
}))
class RateCard extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const { className, game, size, changeRating, ratingEvent, isActive, isRemoved } = this.props;
    const { background_image: backgroundImage, name, slug } = game;

    const coverStyle = getCoverStyle({ backgroundImage, size });
    const truncName = name.length > 50 ? `${name.substring(0, 50)}...` : name;

    return (
      <div
        style={appHelper.isPhoneSize({ size }) ? coverStyle : undefined}
        className={cn('rate-card', className, {
          'rate-card__removed': isRemoved,
        })}
      >
        {appHelper.isDesktopSize({ size }) ? <div className="rate-card__cover" style={coverStyle} /> : ''}
        <div className="rate-card__container">
          <div className="rate-card__title">
            {isActive ? (
              <Link to={paths.game(slug)} href={paths.game(slug)} target="_blank">
                {truncName}
              </Link>
            ) : (
              truncName
            )}
          </div>
          <RateButtonsList isActive={isActive} changeRating={changeRating} game={game} ratingEvent={ratingEvent} />
        </div>
      </div>
    );
  }
}

RateCard.defaultProps = defaultProps;

export default RateCard;
