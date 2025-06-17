import React from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose } from 'recompose';

import isArray from 'lodash/isArray';
import noop from 'lodash/noop';

import './game-card-medium-slider.styl';

import trans from 'tools/trans';

import GameCardMedium from 'app/components/game-card-medium';
import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import Slider from 'app/ui/slider';
import appHelper from 'app/pages/app/app.helper';
import SliderArrow from 'app/ui/slider-arrow';
import AddGameCard from 'app/ui/add-game-card';
import passDownProps from 'tools/pass-down-props';

const leftArrow = <SliderArrow arrowClassName="game-cards-list__slider-arrow" direction="prev" />;

const rightArrow = <SliderArrow arrowClassName="game-cards-list__slider-arrow" direction="next" />;

const hoc = compose(hot);

const propTypes = {
  className: PropTypes.string,
  games: PropTypes.arrayOf(PropTypes.object).isRequired,
  gameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  appSize: appSizeType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  adding: PropTypes.bool,
  addingDisabled: PropTypes.bool,
  onAddClick: PropTypes.func,
  sliderReference: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};

const defaultProps = {
  className: '',
  gameCardProperties: undefined,
  adding: false,
  addingDisabled: false,
  onAddClick: noop,
  sliderReference: undefined,
};

const GameCardMediumSliderComponent = ({
  className,
  games,
  gameCardProperties,
  appSize,
  currentUser,
  dispatch,
  allRatings,
  adding,
  addingDisabled,
  onAddClick,
  sliderReference,
}) => {
  /* eslint-disable react/no-array-index-key */

  if (!isArray(games)) {
    return null;
  }

  return (
    <Slider
      className={cn('game-card-medium-slider', className)}
      arrows={appHelper.isDesktopSize(appSize) && games.length > 3}
      nextArrow={rightArrow}
      prevArrow={leftArrow}
      adaptiveHeight={false}
      dots={false}
      infinite={games.length > 3}
      slidesToScroll={1}
      ref={sliderReference}
      variableWidth
      saveHeightOnHover
      swipeToSlide
    >
      {games.map((game, index) =>
        adding && !game ? (
          <div className="game-card-medium-slider__slide" key={`add-game-${index}`}>
            <AddGameCard
              className="game-card-medium-slider__game game-card-medium-slider__game-add"
              disabled={addingDisabled}
              onClick={() => {
                if (onAddClick) {
                  onAddClick(index);
                }
              }}
              title={trans('shared.add_game')}
            />
          </div>
        ) : (
          <div className="game-card-medium-slider__slide" key={game.id}>
            <GameCardMedium
              appSize={appSize}
              currentUser={currentUser}
              dispatch={dispatch}
              allRatings={allRatings}
              className="game-card-medium-slider__game"
              game={game}
              gameIndex={index}
              {...passDownProps(gameCardProperties, game)}
            />
          </div>
        ),
      )}
    </Slider>
  );
};

GameCardMediumSliderComponent.propTypes = propTypes;
GameCardMediumSliderComponent.defaultProps = defaultProps;

const GameCardMediumSlider = hoc(GameCardMediumSliderComponent);

export default GameCardMediumSlider;
