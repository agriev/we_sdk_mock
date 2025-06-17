import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import SVGInline from 'react-svg-inline';

import rigthIcon from 'assets/icons/nav-right.svg';
import leftIcon from 'assets/icons/nav-left.svg';

import './rate-nav-info.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const renderButtonInfo = (letters) =>
  letters.map((letter) => (
    <div className="rate-nav-info__button" key={letter + 1}>
      {letter}
    </div>
  ));

const RateNavInfoComponent = ({ className }) => (
  <div className={['rate-nav-info', className].join(' ')}>
    <div className="rate-nav-info__rate-wrap rate-nav-info__rate">
      <div className="rate-nav-info__text">Rate:</div>
      <div className="rate-nav-info__buttons">{renderButtonInfo(['Q', 'W', 'A', 'S'])}</div>
    </div>
    <div className="rate-nav-info__rate-wrap rate-nav-info__nav">
      <div className="rate-nav-info__text">Nav:</div>
      <SVGInline svg={leftIcon} />
      <SVGInline svg={rigthIcon} />
    </div>
  </div>
);

RateNavInfoComponent.propTypes = componentPropertyTypes;
RateNavInfoComponent.defaultProps = defaultProps;

const RateNavInfo = hoc(RateNavInfoComponent);

export default RateNavInfo;
