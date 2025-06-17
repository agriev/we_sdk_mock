/* eslint-disable jsx-a11y/media-has-caption */

import './game-card-video.styl';

import React from 'react';
import { browserHistory } from 'react-router';
import PropTypes from 'prop-types';
import cn from 'classnames';
import memoize from 'fast-memoize';
import EventEmitter from 'events';

import crop from 'tools/img/crop';

import Loading2 from 'app/ui/loading-2/loading-2';
import WatchFullVideoButton from 'app/ui/watch-full-video-button';
import WatchFullVideoEvents from 'app/components/watch-full-video/watch-full-video.events';

const ee = new EventEmitter();

ee.setMaxListeners(1000);

class GameCardVideo extends React.Component {
  static propTypes = {
    gameUrl: PropTypes.string,
    url: PropTypes.string.isRequired,
    videoId: PropTypes.string.isRequired,
    preview: PropTypes.string,
    playing: PropTypes.bool,
    doNotStopOnStartAnother: PropTypes.bool,
    visible: PropTypes.bool,
    isOnline: PropTypes.bool,
  };

  static defaultProps = {
    playing: undefined,
    preview: undefined,
    doNotStopOnStartAnother: false,
    visible: true,
    isOnline: false,
  };

  constructor(...arguments_) {
    super(...arguments_);

    this.videoRef = React.createRef();
    this.getPreviewBackground = memoize(this.getPreviewBackground);

    this.state = {
      playing: false,
      started: false,
      loading: false,
    };
  }

  componentDidMount() {
    ee.on('started', this.onStartedVideo);

    WatchFullVideoEvents.onPlayVideo(this.onStartedFullscreenVideo);

    if (this.props.playing) {
      this.play();
    }
  }

  componentDidUpdate(previousProperties) {
    if (this.props.playing && !previousProperties.playing && !this.state.playing) {
      this.play();
    }

    if (!this.props.playing && previousProperties.playing && this.state.playing) {
      this.stop();
    }
  }

  componentWillUnmount() {
    if (typeof ee.off === 'function') {
      ee.off('started', this.onStartedVideo);
    }

    WatchFullVideoEvents.offPlayVideo(this.onStartedFullscreenVideo);
  }

  play = () => {
    if (!this.state.playing && this.videoRef.current) {
      this.setState({ playing: true });
      this.videoRef.current.src = this.props.url;
      this.videoRef.current.play().catch(() => {
        this.setState({ playing: false });
      });
    }
  };

  onPlay = () => {
    ee.emit('started', this.props.url);
    this.setState({ loading: true });
  };

  onCanPlay = () => {
    if (this.state.playing) {
      this.setState({ started: true, loading: false });
    } else if (this.state.loading) {
      this.setState({ loading: false });
    }
  };

  onStartedVideo = (url) => {
    const { doNotStopOnStartAnother } = this.props;

    if (!doNotStopOnStartAnother && this.props.url !== url) {
      this.stop();
    }
  };

  onStartedFullscreenVideo = () => {
    this.stop();
  };

  stop = () => {
    if (this.state.playing) {
      this.setState({ playing: false });
    }
    if (this.state.started || this.state.loading) {
      this.setState({ started: false, loading: false }, this.afterPause);
    }
  };

  afterPause = () => {
    setTimeout(() => {
      if (this.state.playing === false && this.videoRef.current) {
        this.videoRef.current.src = '';
      }
    }, 300);
  };

  onClick = (event) => {
    event.stopPropagation();

    if ((this.state.playing || this.state.started) && this.props.gameUrl) {
      window.location.href = this.props.gameUrl;
    }
  };

  getPreviewBackground = (url, visible) => ({
    backgroundImage: visible && url ? `url(${crop([600, 400], url)})` : undefined,
  });

  render() {
    const { isOnline, visible, videoId } = this.props;
    const { playing, loading, started } = this.state;
    const previewClassName = cn('game-card-video-preview', {
      'game-card-video-preview_button': !playing,
      loading,
      started,
    });

    return (
      <div className={cn('game-card-video', { started })} onClick={this.onClick} role="button" tabIndex={0}>
        {videoId && !isOnline && (
          <WatchFullVideoButton className="game-card-video__watch-full-button" videoId={videoId} visible={started} />
        )}

        <video
          className="game-card-video__video"
          onCanPlay={this.onCanPlay}
          onPlay={this.onPlay}
          ref={this.videoRef}
          playsInline
          muted
          loop
        />

        {loading && <Loading2 className="game-card-video-loader" />}

        <div
          className={previewClassName}
          style={this.getPreviewBackground(this.props.preview, visible)}
          onClick={(event) => {
            event.stopPropagation();
            this.play();
          }}
          role="button"
          tabIndex={0}
        />
      </div>
    );
  }
}

export default GameCardVideo;
