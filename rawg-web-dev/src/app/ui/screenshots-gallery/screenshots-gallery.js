/* eslint-disable no-plusplus */
import React, { Component } from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { Swipeable, defineSwipe } from 'react-touch';

import resize from 'tools/img/resize';

import './screenshots-gallery.styl';

const propTypes = {
  screenshots: PropTypes.arrayOf(
    PropTypes.shape({
      image: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
    }),
  ).isRequired,
  title: PropTypes.string.isRequired,
  isPhoneSize: PropTypes.bool.isRequired,
  visible: PropTypes.bool,
  url: PropTypes.string,
};

class ScreenshotsGallery extends Component {
  static propTypes = propTypes;

  static defaultProps = {
    visible: true,
  };

  constructor(props) {
    super(props);

    this.galleryRef = React.createRef();

    this.state = {
      active: 0,
    };

    this.swipeConfig = defineSwipe({
      swipeDistance: 50,
    });
  }

  changeImageHandler = (event) => {
    event.stopPropagation();

    if (this.galleryRef.current) {
      const { screenshots } = this.props;
      const { clientX } = event;
      const { x, width } = this.galleryRef.current.getBoundingClientRect();

      const count = screenshots.length;
      const galleryWidth = width - 32; // including left and right indents
      const galleryX = x + 16; // including left indent
      const itemWidth = galleryWidth / count;

      for (let i = 0; i < count; i++) {
        const leftBound = i * itemWidth + galleryX;
        const rightBound = (i + 1) * itemWidth + galleryX;

        if (clientX >= leftBound && clientX <= rightBound) {
          if (this.state.active !== i) {
            this.setState({ active: i });
          }
          break;
        }
      }
    }
  };

  nextImageHandler = () => {
    const { screenshots } = this.props;
    const { active } = this.state;
    const nextActive = active === screenshots.length - 1 ? 0 : active + 1;

    this.setState({ active: nextActive });
  };

  prevImageHandler = () => {
    const { screenshots } = this.props;
    const { active } = this.state;
    const nextActive = active === 0 ? screenshots.length - 1 : active - 1;

    this.setState({ active: nextActive });
  };

  renderScreenshots() {
    const { screenshots, title, visible } = this.props;
    const { active } = this.state;

    return (
      <div className="screenshots-gallery__wrapper">
        {screenshots.map((image, index) => (
          <img
            className={cn('screenshots-gallery__image', {
              'screenshots-gallery__image_active': index === active,
            })}
            key={image.id}
            src={visible ? resize(640, image.image) : undefined}
            alt={`${title}, №${image.id}`}
            title={`${title}, №${image.id}`}
          />
        ))}
      </div>
    );
  }

  renderProgress() {
    const { screenshots } = this.props;
    const { active } = this.state;

    return (
      <>
        <div className="screenshots-gallery__overlay" />
        <div className="screenshots-gallery__progress-wrapper">
          {screenshots.map((image, index) => (
            <span
              className={cn('screenshots-gallery__progress', {
                'screenshots-gallery__progress_active': index === active,
              })}
              key={image.id}
            />
          ))}
        </div>
      </>
    );
  }

  render() {
    const { screenshots, isPhoneSize, url } = this.props;
    const className = 'screenshots-gallery';

    if (screenshots.length === 0) return null;

    if (isPhoneSize) {
      return (
        <Swipeable config={this.swipeConfig} onSwipeLeft={this.nextImageHandler} onSwipeRight={this.prevImageHandler}>
          <div className={className} role="button" tabIndex={0}>
            <Link to={url}>
              {this.renderScreenshots()}
              {this.renderProgress()}
            </Link>
          </div>
        </Swipeable>
      );
    }

    return (
      <div className={className} ref={this.galleryRef} onMouseMove={this.changeImageHandler}>
        <Link to={url}>
          {this.renderScreenshots()}
          {this.renderProgress()}
        </Link>
      </div>
    );
  }
}

export default ScreenshotsGallery;
