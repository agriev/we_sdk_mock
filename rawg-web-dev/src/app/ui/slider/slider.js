import React from 'react';
import PropTypes from 'prop-types';
import ReactSlick from 'react-slick';
import cn from 'classnames';

import './slider.styl';

class Slider extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    forwardedRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
    standard: PropTypes.bool,
    saveHeightOnHover: PropTypes.bool,
  };

  static defaultProps = {
    forwardedRef: undefined,
    standard: false,
    saveHeightOnHover: false,
  };

  constructor(...arguments_) {
    super(...arguments_);

    this.reactSlickRef = React.createRef();
    this.containerRef = React.createRef();

    this.state = {
      expanded: false,
    };
  }

  getSnapshotBeforeUpdate(previousProperties, previousState) {
    const { saveHeightOnHover } = this.props;

    if (saveHeightOnHover && this.state.expanded !== previousState.expanded) {
      const container = this.containerRef.current;
      // 10px ставится из-за отриц-го маргина в ".suggestions-section__slider .slick-list"
      // в suggestions-section.styl
      container.style.height = this.state.expanded ? `${container.clientHeight - 10}px` : null;
    }

    return null;
  }

  forceUpdate = () => {
    if (this.reactSlickRef.current) {
      this.reactSlickRef.current.forceUpdate();
    }
  };

  slickGoTo = (slide, withoutAnimation) => {
    if (this.reactSlickRef.current) {
      this.reactSlickRef.current.slickGoTo(slide, withoutAnimation);
    }
  };

  slickPrev = () => {
    if (this.reactSlickRef.current) {
      this.reactSlickRef.current.slickPrev();
    }
  };

  slickNext = () => {
    if (this.reactSlickRef.current) {
      this.reactSlickRef.current.slickNext();
    }
  };

  onMouseEnter = () => {
    if (this.props.saveHeightOnHover) {
      this.setState({ expanded: true });
    }
  };

  onMouseLeave = () => {
    if (this.props.saveHeightOnHover) {
      this.setState({ expanded: false });
    }
  };

  setExpanded = (expanded, callback) => {
    if (this.props.saveHeightOnHover) {
      this.setState({ expanded }, callback);
    }
  };

  render() {
    const { expanded } = this.state;
    const { children, standard } = this.props;

    if (standard) {
      return (
        <div
          className={cn('slider', { expanded })}
          ref={this.containerRef}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
        >
          <div className="slider__track">{children}</div>
        </div>
      );
    }

    return (
      <div
        className={cn('slider-slick', { expanded })}
        ref={this.containerRef}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <ReactSlick swipeToSlide {...this.props} ref={this.reactSlickRef}>
          {children}
        </ReactSlick>
      </div>
    );
  }
}

export default Slider;
