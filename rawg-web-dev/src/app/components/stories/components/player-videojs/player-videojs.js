/* eslint-disable jsx-a11y/media-has-caption, no-console */

import React from 'react';
import PropTypes from 'prop-types';
import videojs from 'video.js';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import Tappable from 'react-tappable/lib/Tappable';

import LoggerEmitter from 'app/pages/app/components/logger/logger.emitter';
// import { size as appSizeType } from 'app/pages/app/app.types';

import 'video.js/dist/video-js.css';

import './player-videojs.styl';

@hot(module)
class VideoJSPlayer extends React.Component {
  static propTypes = {
    src: PropTypes.string.isRequired,
    hidden: PropTypes.bool,
    muted: PropTypes.bool,
    forcePreload: PropTypes.bool,
    videoIdx: PropTypes.number.isRequired,
    forwardedRef: PropTypes.func,
    // size: appSizeType.isRequired,

    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onClick: PropTypes.func.isRequired,
    onContextMenu: PropTypes.func.isRequired,
    onTimeUpdate: PropTypes.func.isRequired,
    onEnded: PropTypes.func.isRequired,
    onPlayError: PropTypes.func.isRequired,
    setPlaying: PropTypes.func.isRequired,
    poster: PropTypes.string.isRequired,
  };

  static defaultProps = {
    hidden: false,
    forcePreload: false,
    muted: true,
    forwardedRef: undefined,
  };

  constructor(props) {
    super(props);

    this.videoRef = React.createRef();
    this.playing = false;
    this.preloadPlay = false;
    this.isUnmounted = false;

    if (this.props.forwardedRef) {
      this.props.forwardedRef(this);
    }
  }

  componentDidMount() {
    const { videoIdx } = this.props;
    const settings = {
      ...this.props,
      fluid: true,
      sources: [
        {
          src: this.props.src,
          type: 'video/mp4',
        },
      ],
    };

    this.player = videojs(this.videoRef.current, settings);

    if (this.props.onTimeUpdate) {
      this.player.on('timeupdate', this.props.onTimeUpdate);
    }

    if (this.props.onEnded) {
      this.player.on('ended', this.props.onEnded);
    }

    if (this.props.onEnded) {
      this.player.on('play', this.onPlay);
    }

    if (this.props.hidden && this.props.forcePreload) {
      this.player.on('ready', () => {
        if (this.player && this.player.paused()) {
          this.player.muted(true);
          this.preloadPlay = true;
          const playPromise = this.player.play();

          const stopPlay = () => {
            if (this.preloadPlay && this.player) {
              this.preloadPlay = false;
              this.playing = false;
              this.player.pause();
              this.currentTime(0);
              this.player.muted(this.props.muted);
            }
          };

          if (playPromise) {
            playPromise
              .then(() => {
                stopPlay();
                LoggerEmitter.emit({
                  text: `Video №${videoIdx + 1} preloaded!`,
                  group: 'stories',
                });
              })
              .catch((error) => {
                this.preloadPlay = false;
                LoggerEmitter.emit({
                  group: 'stories',
                  text: `Preload isn't work. Video №${videoIdx + 1}. Error: «${error.message}»`,
                });
              });
          } else {
            LoggerEmitter.emit({
              group: 'stories',
              text: `Cannot get play promise. Force preload isn't works. Video №${videoIdx + 1}`,
            });
          }
        }
      });
    }
  }

  componentDidUpdate(previousProperties) {
    if (this.player && this.props.muted !== previousProperties.muted) {
      this.player.muted(this.props.muted);
    }
  }

  componentWillUnmount() {
    this.isUnmounted = true;

    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
  }

  onPlay = () => {
    if (!this.preloadPlay) {
      this.playing = true;
      this.props.setPlaying(true);
    }
  };

  paused = () => {
    if (this.player) {
      return this.player.paused();
    }
    return false;
  };

  play = () => {
    if (!this.player) {
      return;
    }

    this.preloadPlay = false;
    this.player.muted(this.props.muted);

    const { videoIdx, setPlaying } = this.props;
    const playPromise = this.player.play();

    playPromise
      .then(() => {
        if (this.isUnmounted === false) {
          setPlaying(true);
        }
        LoggerEmitter.emit({ text: `Playing started! Video №${videoIdx + 1}` });
      })
      .catch((error) => {
        LoggerEmitter.emit({
          text: `Error on trying play video. Video №${videoIdx + 1}. Error: «${error.message}»`,
        });

        if (this.isUnmounted === false && this.player) {
          this.player.pause();
          this.props.onPlayError(error, videoIdx);
        }
      });
  };

  pause = () => {
    this.playing = false;
    if (this.player) {
      this.player.pause();
    }
  };

  currentTime = (value) => {
    if (this.player) {
      return this.player.currentTime(value);
    }

    return 0;
  };

  duration = () => {
    if (this.player) {
      return this.player.duration();
    }

    return 0;
  };

  // wrap the player in a div with a `data-vjs-player` attribute
  // so videojs won't create additional wrapper in the DOM
  // see https://github.com/videojs/video.js/pull/3856
  render() {
    const { onMouseEnter, onMouseLeave, onClick, onContextMenu, poster } = this.props;

    return (
      <Tappable onTap={onClick}>
        <div className="stories__videojs-wrap">
          <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            // onTouchEndCapture={onClick}
            onContextMenu={onContextMenu}
            className={cn('stories__videojs', { hidden: this.props.hidden })}
            role="button"
            tabIndex={0}
            data-src={this.props.src}
          >
            <div data-vjs-player>
              <video poster={poster} playsInline preload="none" ref={this.videoRef} className="video-js" />
            </div>
          </div>
        </div>
      </Tappable>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
export default React.forwardRef((props, reference) => <VideoJSPlayer {...props} forwardedRef={reference} />);
