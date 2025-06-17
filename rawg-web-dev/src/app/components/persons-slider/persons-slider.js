import React from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';

import appHelper from 'app/pages/app/app.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';
import PersonSliderCard from './person-slider-card';

import './persons-slider.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  persons: PropTypes.arrayOf(PropTypes.object).isRequired,
  size: PropTypes.string.isRequired,
  needMoreButton: PropTypes.bool,
  path: PropTypes.string,
};

const defaultProps = {
  className: '',
  needMoreButton: false,
  path: undefined,
};

const PersonsSlider = (props) => {
  const { className, persons, size, needMoreButton, path } = props;
  return (
    <div
      className={cn('persons-slider', className, {
        'persons-slider_many': persons.length > 3,
      })}
    >
      <Slider
        arrows={appHelper.isDesktopSize({ size }) && persons.length > 3}
        dots={appHelper.isPhoneSize({ size }) && persons.length > 1}
        nextArrow={<SliderArrow arrowClassName="persons-slider__arrow" direction="next" />}
        prevArrow={<SliderArrow arrowClassName="persons-slider__arrow" direction="prev" />}
        adaptiveHeight={false}
        variableWidth
        infinite={persons.length > 3}
        slidesToScroll={appHelper.isDesktopSize({ size }) ? 3 : 1}
        swipeToSlide
        standard={appHelper.isPhoneSize({ size })}
      >
        {persons.map((person, index) => {
          const isEmpty = !person.id;
          const isPhoneSize = appHelper.isPhoneSize({ size });

          if (isPhoneSize && isEmpty) return null;

          return (
            <PersonSliderCard
              person={person}
              key={person.id || index}
              size={size}
              isEmpty={isEmpty}
              semantic="gamepage"
            />
          );
        })}
        {needMoreButton && path && (
          <div className="persons-slider__more-link-wrapper">
            <Link className="persons-slider__more-link" to={path} href={path}>
              <div className="persons-slider__more-button">
                <SimpleIntlMessage id="shared.open_more" />
              </div>
            </Link>
          </div>
        )}
      </Slider>
    </div>
  );
};

PersonsSlider.propTypes = componentPropertyTypes;

PersonsSlider.defaultProps = defaultProps;

export default PersonsSlider;
