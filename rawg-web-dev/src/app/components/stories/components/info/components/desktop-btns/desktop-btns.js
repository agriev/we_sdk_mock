import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';

import arrowIcon from 'assets/icons/arrow.svg';

import './desktop-btns.styl';

const componentPropertyTypes = {
  onNextClick: PropTypes.func.isRequired,
  onPrevClick: PropTypes.func.isRequired,
  onPauseClick: PropTypes.func.isRequired,
};

const componentDefaultProperties = {};

const StoriesDesktopBtns = ({ onPrevClick, onNextClick, onPauseClick }) => (
  <div className="stories__info__desktop-btns">
    <div className="stories__info__desktop-btns__prev" onClick={onPrevClick} role="button" tabIndex={0}>
      <SVGInline svg={arrowIcon} />
    </div>
    <div className="stories__info__desktop-btns__pause" onClick={onPauseClick} role="button" tabIndex={0} />
    <div className="stories__info__desktop-btns__next" onClick={onNextClick} role="button" tabIndex={0}>
      <SVGInline svg={arrowIcon} />
    </div>
  </div>
);

StoriesDesktopBtns.propTypes = componentPropertyTypes;
StoriesDesktopBtns.defaultProps = componentDefaultProperties;

export default StoriesDesktopBtns;
