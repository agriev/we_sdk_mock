import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { connect } from 'react-redux';
import { Player } from 'video-react/dist/video-react.cjs';
import { Swipeable, defineSwipe } from 'react-touch';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';
import memoize from 'fast-memoize';

import throttle from 'lodash/throttle';

import './media-detail-viewer.styl';

import getAppContainerWidth from 'tools/get-app-container-width';
import getAppContainerHeight from 'tools/get-app-container-height';
import resize from 'tools/img/resize';
import getAppContainer from 'tools/get-app-container';

import dotsIcon from 'assets/icons/dots.svg';
import appHelper from 'app/pages/app/app.helper';

import CloseButton from 'app/ui/close-button';
import Arrow from 'app/ui/arrow';
import Loading2 from 'app/ui/loading-2';
import RenderMounted from 'app/render-props/render-mounted';

const PREVIEW_LIST_ITEM_WIDTH = 120;

export const gameViewerPropTypes = {
  appSize: PropTypes.string.isRequired,
  activeIndex: PropTypes.number,
  content: PropTypes.oneOf(['screenshots', 'movies', 'imgur', 'youtube', 'twitch']),
  onClose: PropTypes.func,
  items: PropTypes.arrayOf(Object),
  loading: PropTypes.bool,
  displayNext: PropTypes.bool,
  loadNext: PropTypes.func,
};

const defaultProps = {
  activeIndex: 0,
  content: 'screenshots',
  onClose: () => {},
  items: [],
  loading: false,
  displayNext: false,
  loadNext: () => {},
};

@hot
@connect((state) => ({
  appSize: state.app.size,
}))
class MediaDetailViewer extends Component {
  static propTypes = gameViewerPropTypes;

  constructor(props) {
    super(props);

    const { activeIndex = 0 } = this.props;

    this.state = { activeIndex };

    if (typeof window !== 'undefined') {
      getAppContainer().style.overflowY = 'hidden';
    }

    this.previewListRef = React.createRef();
    this.sliderRef = React.createRef();
    this.slidesRef = React.createRef();

    this.getPreviewImageStyle = memoize(this.getPreviewImageStyle);
    this.getPreviewMovieStyle = memoize(this.getPreviewMovieStyle);
    this.getPreviewImgurStyle = memoize(this.getPreviewImgurStyle);
    this.getPreviewYoutubeStyle = memoize(this.getPreviewYoutubeStyle);
    this.getPreviewTwitchStyle = memoize(this.getPreviewTwitchStyle);
    this.getSwipeToFunc = memoize(this.getSwipeToFunc);
    this.getImageStyle = memoize(this.getImageStyle);
    this.getStyle = memoize(this.getStyle);

    this.onResize = throttle(this.onResize, 100);

    this.swipeConfig = defineSwipe({
      swipeDistance: 50,
    });
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('wheel', this.onWheel);

    this.updateScroll();
  }

  componentDidUpdate() {
    this.updateScroll();
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    getAppContainer().style.overflowY = '';
  }

  updateScroll = () => {
    if (this.sliderRef.current) {
      const { activeIndex } = this.state;
      const windowWidth = getAppContainerWidth();

      this.slidesRef.current.style.transform = `translateX(-${activeIndex * windowWidth}px)`;
    }
  };

  onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        this.swipePrevious();
        break;
      case 'ArrowRight':
        this.swipeNext();
        break;
      default:
    }
  };

  onResize = () => {
    this.forceUpdate();
  };

  onWheel = (event) => {
    if (event.deltaY > 0) {
      this.swipeNext();
    } else {
      this.swipePrevious();
    }
  };

  getImageStyle = (image, size, visible) => {
    if (!visible) {
      return undefined;
    }

    return {
      backgroundImage: `url(${this.getImageSrc(image, size, visible)})`,
    };
  };

  getImageSrc = (image, size, visible) => {
    if (!visible) {
      return undefined;
    }

    if (appHelper.isPhoneSize({ size })) {
      return resize(640, image);
    }

    return resize(1920, image);
  };

  getPreviewImageStyle = (image, visible) => {
    if (!visible) {
      return undefined;
    }
    return {
      backgroundImage: `url("${resize(200, image)}")`,
    };
  };

  getPreviewMovieStyle = (preview, visible) => {
    if (!visible) {
      return undefined;
    }
    return {
      backgroundImage: `url("${preview}")`,
    };
  };

  getPreviewImgurStyle = (image, visible) => {
    if (!visible) {
      return undefined;
    }
    return {
      backgroundImage: `url(${image.replace(/\.(jpe?g|png)/g, 'm.$1')})`,
    };
  };

  getPreviewYoutubeStyle = (url, visible) => {
    if (!visible) {
      return undefined;
    }
    return {
      backgroundImage: `url(${url})`,
    };
  };

  getPreviewTwitchStyle = (thumbnail, visible) => {
    if (!visible) {
      return undefined;
    }
    return {
      backgroundImage: `url(${thumbnail.replace('%{width}', '440').replace('%{height}', '250')})`,
    };
  };

  getSwipeToFunc = (index) => () => this.swipeTo(index);

  swipeNext = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    const { activeIndex } = this.state;

    if (activeIndex + 1 < this.props.items.length) {
      this.setActiveIndex('inc');
    }
  };

  swipePrevious = (e) => {
    if (e) {
      e.stopPropagation();
    }

    const { activeIndex } = this.state;

    if (activeIndex === 0) return;

    this.setActiveIndex('dec');
  };

  swipeTo = (index) => {
    this.setActiveIndex(index);
  };

  setActiveIndex = (index) => {
    this.setState(({ activeIndex }, props) => {
      const { loading, appSize } = props;

      let finalIndex = index;

      if (index === 'inc') {
        if (activeIndex + 1 >= this.props.items.length) {
          return null;
        }

        finalIndex = activeIndex + 1;
      }

      if (index === 'dec') {
        if (activeIndex <= 0) {
          return null;
        }

        finalIndex = activeIndex - 1;
      }

      if (!loading && finalIndex + 7 >= this.props.items.length) {
        this.props.loadNext();
      }

      if (appHelper.isDesktopSize(appSize) && this.previewListRef.current) {
        this.previewListRef.current.scrollLeft = (finalIndex - 2) * PREVIEW_LIST_ITEM_WIDTH;
      }

      return { activeIndex: finalIndex };
    });
  };

  handleSliderClick = (event) => {
    const { clientX } = event;
    const halfWindow = getAppContainerWidth() / 2;

    if (clientX > halfWindow) {
      this.swipeNext();
    } else {
      this.swipePrevious();
    }
  };

  stopPropagation = (e) => {
    e.stopPropagation();
  };

  close = () => {
    const { onClose } = this.props;

    getAppContainer().style.overflowY = '';

    onClose();
  };

  getStyle = (width) => ({
    width: `${width}px`,
  });

  calcElementStyle = () => {
    const windowWidth = getAppContainerWidth();
    const windowHeight = getAppContainerHeight();

    return this.getStyle(windowWidth, windowHeight);
  };

  renderSlider() {
    const { appSize, loading, items } = this.props;
    const { activeIndex } = this.state;
    const isPhone = appHelper.isPhoneSize(appSize);

    return (
      <div className="game-viewer__slider" ref={this.sliderRef} onClick={this.handleSliderClick} role="presentation">
        {activeIndex !== 0 && (
          <div
            className="game-viewer__slider-nav game-viewer__slider-nav_left"
            onClick={this.swipePrevious}
            role="presentation"
          >
            <Arrow direction="left" size="small" />
          </div>
        )}
        <Swipeable
          config={this.swipeConfig}
          onSwipeLeft={isPhone ? this.swipeNext : undefined}
          onSwipeRight={isPhone ? this.swipePrevious : undefined}
        >
          <div className="game-viewer__slides" ref={this.slidesRef}>
            {items.map((item, index) => {
              const className = 'game-viewer__slide';
              const wrapClassName = 'game-viewer__slide-wrap';

              switch (item.type) {
                case 'screenshots': {
                  const visible = activeIndex === index || (index >= activeIndex - 3 && index <= activeIndex + 3);

                  return (
                    <div key={item.image || ''} className={wrapClassName} style={this.calcElementStyle()}>
                      <div
                        className={`${className} game-viewer__slide_screenshot`}
                        style={this.getImageStyle(item.image || '', appSize, visible)}
                      />
                    </div>
                  );
                }

                case 'movies':
                  return (() => {
                    const { id, data, preview } = item;

                    return (
                      <div
                        className={className}
                        key={id}
                        onClick={this.stopPropagation}
                        role="presentation"
                        style={this.calcElementStyle()}
                      >
                        <div className="game-viewer__movie-slide">
                          <div className="game-viewer__video-wrapper">
                            {activeIndex === index && <Player poster={preview} src={data.max} autoPlay />}
                          </div>
                        </div>
                      </div>
                    );
                  })();

                case 'imgur':
                  return (() => {
                    const { image = '' } = item;
                    const style = {
                      backgroundImage: `url(${image.replace(/\.(jpe?g|png)/g, 'h.$1')})`,
                    };
                    return (
                      <div key={image.id} className={wrapClassName} style={this.calcElementStyle()}>
                        <div className={className} style={style} />
                      </div>
                    );
                  })();

                case 'youtube':
                  return (() => {
                    const { external_id: externalId } = item;

                    return (
                      <div
                        className={className}
                        key={externalId}
                        onClick={this.stopPropagation}
                        role="presentation"
                        style={this.calcElementStyle()}
                      >
                        <div className="game-viewer__movie-slide">
                          <div className="game-viewer__video-wrapper">
                            <div className="video-card__video">
                              {activeIndex === index && (
                                <iframe
                                  title="Youtube player"
                                  allowFullScreen
                                  sandbox="allow-same-origin allow-forms allow-popups allow-scripts allow-presentation"
                                  src={`https://youtube.com/embed/${externalId}?autoplay=1`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })();

                case 'twitch':
                  return (() => {
                    const { external_id: externalId, channel } = item;

                    return (
                      <div
                        className={className}
                        key={externalId}
                        onClick={this.stopPropagation}
                        role="presentation"
                        style={this.calcElementStyle()}
                      >
                        <div className="game-viewer__movie-slide">
                          <div className="game-viewer__video-wrapper">
                            <div className="video-card__video">
                              {activeIndex === index && (
                                <iframe
                                  title="Twitch player"
                                  allowFullScreen
                                  sandbox="allow-same-origin allow-forms allow-popups allow-scripts allow-presentation"
                                  src={
                                    channel
                                      ? `https://player.twitch.tv/?channel=${channel}&autoplay=true`
                                      : `https://player.twitch.tv/?video=${externalId}&autoplay=true`
                                  }
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })();

                default:
                  return {};
              }
            })}
          </div>
        </Swipeable>
        {loading && (
          <div className="game-viewer__loading">
            <Loading2 radius={48} stroke={2} />
          </div>
        )}
        {activeIndex + 1 !== items.length && (
          <div
            className="game-viewer__slider-nav game-viewer__slider-nav_right"
            onClick={this.swipeNext}
            role="presentation"
          >
            <Arrow direction="right" size="small" />
          </div>
        )}
      </div>
    );
  }

  renderPreviewList() {
    const { content } = this.props;
    const { displayNext, loadNext } = this.props;
    const { activeIndex } = this.state;

    // if (content === 'movies') {
    //   content = 'screenshots';
    // }

    return (
      <div
        className={classnames('game-viewer__list', {
          'game-viewer__videos-list': content === 'movies' || content === 'youtube' || content === 'twitch',
        })}
      >
        <div className="game-viewer__list-inner" ref={this.previewListRef}>
          {this.props.items.map((item, index) => {
            const className = classnames('game-viewer__list-item', {
              'game-viewer__list-item_active': activeIndex === index,
            });

            switch (item.type) {
              case 'screenshots':
                return (() => {
                  const { image = '' } = item;
                  return (
                    <RenderMounted key={image}>
                      {({ visible, onChildReference }) => {
                        const style = this.getPreviewImageStyle(image, visible);

                        return (
                          <div
                            ref={(element) => onChildReference(element)}
                            className={className}
                            style={style}
                            onClick={this.getSwipeToFunc(index)}
                            role="presentation"
                          >
                            <div className="game-viewer__list-item__hover" style={style} />
                          </div>
                        );
                      }}
                    </RenderMounted>
                  );
                })();

              case 'movies':
                return (() => {
                  const { id, preview } = item;
                  return (
                    <RenderMounted key={id}>
                      {({ visible, onChildReference }) => {
                        const style = this.getPreviewMovieStyle(preview, visible);

                        return (
                          <div
                            ref={(element) => onChildReference(element)}
                            className={className}
                            style={style}
                            onClick={this.getSwipeToFunc(index)}
                            role="presentation"
                          >
                            <div className="game-viewer__list-item__hover" style={style} />
                            <div className="game-viewer__list-item-icon" />
                          </div>
                        );
                      }}
                    </RenderMounted>
                  );
                })();

              case 'imgur':
                return (() => {
                  const { image } = item;
                  return (
                    <RenderMounted key={image}>
                      {({ visible, onChildReference }) => {
                        const style = this.getPreviewImgurStyle(image, visible);

                        return (
                          <div
                            ref={(element) => onChildReference(element)}
                            className={className}
                            style={style}
                            onClick={this.getSwipeToFunc(index)}
                            role="presentation"
                          >
                            <div className="game-viewer__list-item__hover" style={style} />
                          </div>
                        );
                      }}
                    </RenderMounted>
                  );
                })();

              case 'youtube':
                return (() => {
                  const { url } = item.thumbnails.medium;

                  return (
                    <RenderMounted key={url}>
                      {({ visible, onChildReference }) => {
                        const style = this.getPreviewYoutubeStyle(url, visible);

                        return (
                          <div
                            ref={(element) => onChildReference(element)}
                            className={className}
                            style={style}
                            onClick={this.getSwipeToFunc(index)}
                            role="presentation"
                          >
                            <div className="game-viewer__list-item__hover" style={style} />
                            <div className="game-viewer__list-item-icon" />
                          </div>
                        );
                      }}
                    </RenderMounted>
                  );
                })();

              case 'twitch':
                return (() => {
                  const { thumbnail } = item;
                  return (
                    <RenderMounted key={thumbnail}>
                      {({ visible, onChildReference }) => {
                        const style = this.getPreviewTwitchStyle(thumbnail, visible);

                        return (
                          <div
                            ref={(element) => onChildReference(element)}
                            className={className}
                            style={style}
                            onClick={this.getSwipeToFunc(index)}
                            role="presentation"
                          >
                            <div className="game-viewer__list-item__hover" style={style} />
                            <div className="game-viewer__list-item-icon" />
                          </div>
                        );
                      }}
                    </RenderMounted>
                  );
                })();

              default:
                return {};
            }
          })}

          {displayNext && (
            <div className="game-viewer__more" onClick={loadNext} role="presentation">
              <SVGInline svg={dotsIcon} />
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="game-viewer game-viewer_full-size">
        <CloseButton className="game-viewer__close" onClick={this.close} />
        {this.renderSlider()}
        {this.renderPreviewList()}
      </div>
    );
  }
}

MediaDetailViewer.defaultProps = defaultProps;

export default MediaDetailViewer;
