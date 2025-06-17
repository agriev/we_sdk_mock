import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Swipeable } from 'react-touch';
import cookies from 'browser-cookies';
import cn from 'classnames';

import noop from 'lodash/noop';

import ShowMoreButton from 'app/ui/show-more-button';
// import CloseButton from 'app/ui/close-button';

import { updateSetting } from 'app/components/current-user/current-user.actions';

import slides from './help-popup.slides';

import './help-popup.styl';

export const helpPopupClosedKey = 'help-popup-closed';

const hoc = compose(hot);

const propTypes = {
  onClose: PropTypes.func,
};

const defaultProps = {
  onClose: noop,
};

const HelpPopupComponent = ({ onClose }) => {
  const dispatch = useDispatch();
  const locale = useSelector((state) => state.app.locale);

  const [disabled, setDisabled] = useState(false);
  const [currentSlideIndex, setSlide] = useState(0);
  const [active, setActive] = useState(false);

  const maxSlideIndex = slides.length - 1;
  const nextSlideIndex = currentSlideIndex + 1;
  const previousSlideIndex = currentSlideIndex - 1;

  const currentSlide = slides[currentSlideIndex];

  const deactivate = useCallback(() => {
    setActive(false);

    setTimeout(() => {
      setDisabled(true);
      onClose();
    }, 1000);
  }, []);

  // const onCloseClick = useCallback(() => {
  //   deactivate();
  // }, [currentSlideIndex]);

  const onClickNext = useCallback(() => {
    if (currentSlideIndex < maxSlideIndex) {
      setSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex]);

  const onClickPrevious = useCallback(() => {
    if (currentSlideIndex > 0) {
      setSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex]);

  const onNextButtonClick = useCallback(() => {
    if (currentSlideIndex < maxSlideIndex) {
      onClickNext();
    } else {
      deactivate();
    }
  }, [currentSlideIndex]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowLeft') {
        onClickPrevious();
      }

      if (event.key === 'ArrowRight') {
        onClickNext();
      }
    },
    [currentSlideIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [currentSlideIndex]);

  useEffect(() => {
    dispatch(updateSetting(helpPopupClosedKey, true));
    cookies.erase('just-registered');
    setActive(true);
  }, []);

  if (disabled) {
    return null;
  }

  return (
    <>
      <div className={cn('help-popup-overlay', { active })} />
      <Swipeable onSwipeLeft={onClickNext} onSwipeRight={onClickPrevious}>
        <div className={cn('help-popup', { active })}>
          {/* <CloseButton className="help-popup__close-btn" onClick={onCloseClick} /> */}
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.key}
              className={cn('help-popup__image-wrap', {
                active: currentSlideIndex === slideIndex,
                next: slideIndex === nextSlideIndex,
                previous: slideIndex === previousSlideIndex,
              })}
            >
              <div
                key={slide.key}
                className="help-popup__image"
                style={{
                  backgroundImage: `url(${slides[slideIndex].image[locale]})`,
                }}
              />
            </div>
          ))}
          <div className="help-popup__dots">
            {slides.map((slide) => (
              <div
                key={slide.key}
                className={cn('help-popup__dots__dot', { active: slide.key === currentSlide.key })}
              />
            ))}
          </div>
          <div className="help-popup__title">{currentSlide.title[locale]}</div>
          <div className="help-popup__text">{currentSlide.text[locale]}</div>
          {currentSlideIndex > 0 && (
            <div className="help-popup__arror-left" onClick={onClickPrevious} role="button" tabIndex={-1} />
          )}
          {currentSlideIndex < maxSlideIndex && (
            <div className="help-popup__arror-right" onClick={onClickNext} role="button" tabIndex={-1} />
          )}
          <ShowMoreButton
            className={cn('help-popup__button', { finished: currentSlideIndex === maxSlideIndex })}
            grayIcon
            onClick={onNextButtonClick}
            showIcon={currentSlideIndex < maxSlideIndex}
            text={
              <FormattedMessage id={currentSlideIndex === maxSlideIndex ? 'shared.finish-tutorial' : 'shared.next'} />
            }
          />
        </div>
      </Swipeable>
    </>
  );
};

HelpPopupComponent.propTypes = propTypes;
HelpPopupComponent.defaultProps = defaultProps;

const HelpPopup = hoc(HelpPopupComponent);

export default HelpPopup;
