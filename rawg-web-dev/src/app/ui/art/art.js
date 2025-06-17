import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import { hot } from 'react-hot-loader';

import keysEqual from 'tools/keys-equal';
import colorHandler from 'tools/color-handler';

import appHelper from 'app/pages/app/app.helper';

import styleVars from 'styles/vars.json';
import imageNames from 'assets/images/arts';

import './art.styl';

const images = [];

imageNames.forEach((imageName) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const path = require(`assets/images/arts/${imageName}`);
  const color = imageName.split('_')[1].replace(/\.(jpe?g|png)$/, '');

  images.push({ path, color });
});

export const artPropTypes = {
  image: PropTypes.oneOfType([
    PropTypes.shape({
      path: PropTypes.string,
      color: PropTypes.string,
      endColor: PropTypes.string,
    }),
    PropTypes.string,
  ]),
  video: PropTypes.string,
  rawImage: PropTypes.string,
  svg: PropTypes.string,
  height: PropTypes.string,
  colored: PropTypes.bool,
  forceStartColor: PropTypes.bool,
  secondary: PropTypes.bool,
  ugly: PropTypes.bool,
  bottom: PropTypes.bool,
  bottomHeight: PropTypes.string,
  size: PropTypes.string,
  className: PropTypes.string,
  additionalGradient: PropTypes.string,
  additionalDiv: PropTypes.string,
};

const defaultProps = {
  size: 'desktop',
  image: undefined,
  rawImage: undefined,
  svg: undefined,
  height: '100%',
  colored: false,
  forceStartColor: false,
  secondary: false,
  ugly: false,
  bottom: false,
  bottomHeight: '10%',
  className: '',
  additionalGradient: undefined,
  additionalDiv: undefined,
};

function getRandomImage() {
  return images[Math.floor(Math.random() * images.length)];
}

@hot(module)
export default class Art extends Component {
  static propTypes = artPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.videoRef = React.createRef();
    this.randomImage = getRandomImage();

    if (this.props.bottom) {
      this.randomBottomImage = getRandomImage();

      while (this.randomBottomImage.path === this.randomImage.path) {
        this.randomBottomImage = getRandomImage();
      }
    }
  }

  shouldComponentUpdate(nextProperties) {
    return !keysEqual(this.props, nextProperties, [
      'image.path',
      'image.color',
      'height',
      'ugly',
      'size',
      'additionalDiv',
    ]);
  }

  onCanPlay = () => {
    if (this.videoRef.current) {
      this.videoRef.current.play();
    }
  };

  getResizeHeight() {
    const { size } = this.props;
    return appHelper.isDesktopSize({ size }) ? 1280 : 640;
  }

  getStyle() {
    const { secondary, colored, forceStartColor, height, ugly, rawImage, additionalGradient, video } = this.props;
    const image = this.props.image || this.randomImage;
    const direction = secondary ? 'left' : 'bottom';
    let startColor = colored && !forceStartColor ? 'rgba(0,0,0,0.1)' : image.color;
    let endColor = colored ? image.endColor || image.color : styleVars.mainBGColor;

    if (colored && image && image.path) {
      const colorRGB = colorHandler.hexToRgb(image.color);

      startColor = `rgba(${colorRGB.join(',')},${ugly ? 0.7 : 0})`;
      endColor = 'rgb(15,15,15)';
    }

    if (image.path === 'RANDOM') {
      image.path = this.randomImage.path;
    }

    const backgroundImage = (() => {
      const rules = [];

      if (image === 'none') {
        //
      } else if (rawImage) {
        rules.push(`url(${rawImage})`);
      } else if (image.path && !video) {
        rules.push(`linear-gradient(to ${direction}, ${startColor}, rgb(15,15,15))`);
        if (additionalGradient) {
          rules.push(additionalGradient);
        }
        if (colored) {
          rules.push('linear-gradient(to bottom, rgba(15,15,15,0.8), rgba(15,15,15,0.5))');
        }
        rules.push(`url('${image.path.replace('/media/', `/media/resize/${this.getResizeHeight()}/-/`)}')`);
      } else {
        const startColorValue = 'rgb(15,15,15)';
        rules.push(`linear-gradient(to ${direction}, ${startColorValue}, rgb(15,15,15))`);
      }

      return rules.join(',');
    })();

    return {
      height,
      backgroundColor: colored || secondary ? 'transparent' : startColor,
      backgroundImage,
      zIndex: 1,
    };
  }

  getBottomStyle() {
    const { bottomHeight } = this.props;
    const direction = 'bottom';
    const startColor = styleVars.mainBGColor;
    const endColor = this.randomBottomImage.color;

    return {
      height: bottomHeight,
      backgroundImage: `
        linear-gradient(to ${direction}, ${startColor}, ${endColor}),
        url('${this.randomBottomImage.path.replace('/media/', `/media/resize/${this.getResizeHeight()}/-/`)}')
      `,
    };
  }

  render() {
    const { bottom, height, svg, className, additionalDiv, video } = this.props;
    const { secondary, colored } = this.props;

    return (
      <>
        {additionalDiv && <div className={additionalDiv} />}
        <div className={cn(className, 'art-wrapper')} style={{ height }}>
          <div
            className={cn('art', {
              art_secondary: secondary,
              art_colored: colored,
            })}
            style={this.getStyle()}
          />
          {video && (
            <div className="art__video-wrap">
              <video
                src={video}
                className="art__video"
                onCanPlay={this.onCanPlay}
                ref={this.videoRef}
                playsInline
                autoPlay
                muted
                loop
              />
            </div>
          )}
          {svg && <SVGInline svg={svg} />}
          {bottom && <div className="art art_bottom" style={this.getBottomStyle()} />}
        </div>
      </>
    );
  }
}
