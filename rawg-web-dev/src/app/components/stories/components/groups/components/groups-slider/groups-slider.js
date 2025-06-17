import React, { Component } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import throttle from 'lodash/throttle';

import appHelper from 'app/pages/app/app.helper';

import { appSizeType } from 'app/pages/app/app.types';

import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';

import '../../groups.styl';

const propTypes = {
  groups: PropTypes.node.isRequired,
  register: PropTypes.node,
  playingGroup: PropTypes.number.isRequired,
  loadGroups: PropTypes.func.isRequired,
  onMouseMove: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  showGroupName: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
};

const defaultProps = {
  register: null,
};

class GroupsSlider extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.slider = React.createRef();
    this.infoGroups = React.createRef();
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.playingGroup !== this.props.playingGroup) {
      const slide = this.getScrollSlide(this.props.playingGroup - 1);

      this.slider.current.slickGoTo(slide);
      setTimeout(this.loadGroupsIfNeed, 300);
      this.props.showGroupName();
    }
  }

  getCurrentSlide = (checkPlayingGroup = true) => {
    const currentSlide = get(this, 'slider.current.innerSlider.state.currentSlide', 0);

    if (checkPlayingGroup) {
      return Math.max(currentSlide, this.props.playingGroup);
    }

    return currentSlide;
  };

  getScrollSlide = (pos) => {
    const { size } = this.props;
    const groupsLength = this.props.groups.length;
    const maxSlide = appHelper.isDesktopSize({ size }) ? groupsLength - 8 : groupsLength - 1;

    return Math.min(pos, maxSlide);
  };

  onWheel = (event) => {
    event.preventDefault();
    const currentSlide = this.getCurrentSlide(false);
    const offset = event.deltaY > 0 ? 3 : -3;
    this.props.onMouseMove();

    if (currentSlide >= 0) {
      this.slider.current.slickGoTo(this.getScrollSlide(currentSlide + offset));
      setTimeout(this.loadGroupsIfNeed, 300);
    }
  };

  onSwipe = () => {
    this.props.onMouseMove();
    setTimeout(this.loadGroupsIfNeed, 300);
  };

  onArrowClick = (event) => {
    event.stopPropagation();
    this.props.onMouseMove();

    const currentSlide = this.getCurrentSlide(false);
    const offset = event.currentTarget.getAttribute('direction') === 'next' ? 3 : -3;

    if (currentSlide >= 0) {
      this.slider.current.slickGoTo(this.getScrollSlide(currentSlide + offset));
      setTimeout(this.loadGroupsIfNeed, 300);
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  loadGroupsIfNeed = throttle(
    () => {
      const { loadGroups, groups } = this.props;
      const currentSlide = this.getCurrentSlide();

      if (currentSlide >= 0 && currentSlide + 10 > groups.length) {
        loadGroups();
      }
    },
    100,
    { trailing: false },
  );

  render() {
    const { groups, register } = this.props;

    const SliderNextArrow = (
      <SliderArrow arrowClassName="stories__groups__arrow" direction="next" onClickCapture={this.onArrowClick} />
    );

    const SliderPreviousArrow = (
      <SliderArrow arrowClassName="stories__groups__arrow" direction="prev" onClickCapture={this.onArrowClick} />
    );

    return (
      <div
        className="stories__groups__block"
        ref={this.infoGroups}
        onWheel={this.onWheel}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        <Slider
          ref={this.slider}
          dots={false}
          infinite={false}
          accessibility={false}
          onSwipe={this.onSwipe}
          nextArrow={SliderNextArrow}
          prevArrow={SliderPreviousArrow}
          slidesToScroll={1}
          variableWidth
          swipeToSlide
          arrows
        >
          {groups}
          {register}
        </Slider>
      </div>
    );
  }
}

export default GroupsSlider;
