import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import omit from 'lodash/omit';

import Arrow from 'app/ui/arrow';

import './slider-arrow.styl';

const sliderArrowPropertyTypes = {
  direction: PropTypes.oneOf(['next', 'prev']).isRequired,
  disabled: PropTypes.bool,
  arrowClassName: PropTypes.string,
  className: PropTypes.string,
  onClickCapture: PropTypes.func,
};

const sliderArrowDefaultProperties = {
  className: '',
  arrowClassName: '',
  disabled: false,
  onClickCapture: undefined,
};

function SliderArrow(props) {
  const { direction, disabled, className, arrowClassName } = props;

  const newProperties = {
    ...omit(props, ['arrowClassName', 'currentSlide', 'slideCount']),
    className: classnames('slider-arrow', {
      'slider-arrow_disabled': disabled,
      [`slider-arrow_${direction}`]: direction,
      [className]: className,
      [arrowClassName]: arrowClassName,
    }),

    // данный код нужен для того чтобы переписать дефолтные стили стрелки слайдера,
    // в которых прописывается display:block, что ломает нашу флексбокс-вёрстку
    style: {},
  };

  return (
    <div {...newProperties}>
      <Arrow size="medium" direction={direction === 'next' ? 'right' : 'left'} />
    </div>
  );
}

SliderArrow.propTypes = sliderArrowPropertyTypes;
SliderArrow.defaultProps = sliderArrowDefaultProperties;

export default SliderArrow;
