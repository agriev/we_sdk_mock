/* eslint-disable jsx-a11y/media-has-caption, no-console */

import React from 'react';
import PropTypes from 'prop-types';
import { Player, ControlBar } from 'video-react/dist/video-react.cjs';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import Tappable from 'react-tappable/lib/Tappable';
import memoize from 'fast-memoize';

// import LoggerEmitter from 'app/pages/app/components/logger/logger.emitter';

import 'video-react/dist/video-react.css';
import './player-video-react.styl';
// import appHelper from 'app/pages/app/app.helper';

// import { size as appSizeType } from 'app/pages/app/app.types';

@hot(module)
class VideoReactPlayer extends React.Component {
  static propTypes = {
    src: PropTypes.string.isRequired,
    hidden: PropTypes.bool,
    muted: PropTypes.bool,
    // videoIdx: PropTypes.number.isRequired,
    forcePreload: PropTypes.bool,
    forwardedRef: PropTypes.func,
    // size: appSizeType.isRequired,

    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onClick: PropTypes.func.isRequired,
    onContextMenu: PropTypes.func.isRequired,
    onTimeUpdate: PropTypes.func.isRequired,
    onEnded: PropTypes.func.isRequired,
    // onPlayError: PropTypes.func.isRequired,
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

    this.srcRef = React.createRef();
    this.preloadPlay = false;
    this.isPaused = false;
    this.unmounted = false;

    if (this.props.forwardedRef) {
      this.props.forwardedRef(this);
    }

    this.state = {
      showPoster: true,
    };

    this.getBackground = memoize(this.getBackground);
  }

  componentDidMount() {
    if (this.props.hidden && this.props.forcePreload && this.paused()) {
      this.volume(0);
      this.preloadPlay = true;
      this.player.play();
    }
  }

  componentWillUnmount() {
    this.unmounted = true;

    this.player.video.video.pause();
    this.player.video.video.removeAttribute('src');
    this.player.video.video.load();
  }

  getReadyState = () => this.player.video.video.readyState;

  onCanPlay = () => {
    // const { videoIdx } = this.props;
    // LoggerEmitter.emit({
    //   text: `Video №${videoIdx + 1} can play, readyState: ${this.getReadyState()}!`,
    //   group: 'stories',
    // });

    if (this.state.showPoster) {
      this.setState({ showPoster: false });
    }
  };

  onDeviceOrientation = (event) => {
    if (!this.paused()) {
      this.reactOnOrientation(event, this.player.video.video);
    }
  };

  onPlay = () => {
    if (this.isPaused || this.unmounted) {
      this.pause();
      return;
    }

    if (this.preloadPlay) {
      this.preloadPlay = false;
      this.pause();
      this.currentTime(0);
      this.volume(this.props.muted ? 0 : 1);
    } else {
      this.props.setPlaying(true);
    }
  };

  getBackground = (poster) => ({ backgroundImage: `url(${poster})` });

  playerRef = (element) => {
    this.player = element;
  };

  paused = () => {
    if (this.player) {
      return this.player.getState().player.paused;
    }

    return true;
  };

  play = () => {
    if (this.unmounted) {
      return;
    }

    this.isPaused = false;

    if (this.player) {
      this.preloadPlay = false;
      this.volume(this.props.muted ? 0 : 1);
      this.player.play();
    }

    this.tryPlay();
  };

  tryPlay = () => {
    // const { videoIdx } = this.props;

    if (this.isPaused || this.unmounted) {
      return;
    }

    if (!this.paused()) {
      // LoggerEmitter.emit({
      //   text: `Playing ${videoIdx + 1} initiated, no need try to play!`,
      //   group: 'stories',
      // });
      return;
    }

    if (this.player) {
      this.preloadPlay = false;
      this.volume(this.props.muted ? 0 : 1);
      this.player.play();
    }

    if (this.paused()) {
      // LoggerEmitter.emit({
      //   text: `Paused. Retry trying play ${videoIdx + 1} on 100ms!`,
      //   group: 'stories',
      // });
      setTimeout(this.tryPlay, 100);
    } else {
      // LoggerEmitter.emit({
      //   text: `Playing ${videoIdx + 1} initiated!`,
      //   group: 'stories',
      // });
    }
  };

  pause = () => {
    this.isPaused = true;

    if (this.player) {
      return this.player.pause();
    }
    return undefined;
  };

  currentTime = (value) => {
    if (this.player) {
      if (value !== undefined) {
        return this.player.seek(value);
      }
      return this.player.getState().player.currentTime;
    }
    return 0;
  };

  duration = () => {
    if (this.player) {
      return this.player.getState().player.duration;
    }
    return 0;
  };

  volume = (value) => {
    const { player } = this.player.getState();

    if (value) {
      this.player.volume = value;
      return undefined;
    }

    return player.volume;
  };

  toggleFullscreen = () => {
    this.player.toggleFullscreen();
  };

  // wrap the player in a div with a `data-vjs-player` attribute
  // so videojs won't create additional wrapper in the DOM
  // see https://github.com/videojs/video.js/pull/3856
  render() {
    const { showPoster } = this.state;
    const {
      onMouseEnter,
      onMouseLeave,
      onClick,
      onContextMenu,
      onTimeUpdate,
      onEnded,
      hidden,
      src,
      muted,
      poster,
    } = this.props;

    return (
      <Tappable onTap={onClick}>
        <div className="stories__video-react-wrap">
          <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            // onTouchEndCapture={onClick}
            onContextMenu={onContextMenu}
            className={cn('stories__video-react', { hidden, poster: showPoster })}
            role="button"
            tabIndex={0}
            data-src={src}
          >
            <div className="stories__video-react__poster" style={this.getBackground(poster)} />
            <Player
              ref={this.playerRef}
              aspectRatio="16:9"
              preload="auto"
              playsInline
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              onCanPlay={this.onCanPlay}
              onPlay={this.onPlay}
              muted={muted}
              onCanPlayThrough={this.onCanPlayThrough}
              onLoadedData={this.onLoadedData}
              fluid
            >
              <source ref={this.srcRef} src={src} />
              <ControlBar disableCompletely />
            </Player>
          </div>
        </div>
      </Tappable>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
export default React.forwardRef((props, reference) => <VideoReactPlayer {...props} forwardedRef={reference} />);
