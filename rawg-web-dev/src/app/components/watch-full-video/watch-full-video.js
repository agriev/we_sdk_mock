import React from 'react';
// import PropTypes from 'prop-types';
// import cn from 'classnames';
import YouTube from 'react-youtube';

import getAppContainer from 'tools/get-app-container';

import { YOUTUBE_PLAYING, YOUTUBE_BUFFERING } from 'tools/youtube/player-states';

import CloseButton from 'app/ui/close-button';

import WatchFullVideoEvents from 'app/components/watch-full-video/watch-full-video.events';

import './watch-full-video.styl';

const playerOptions = {
  width: '100%',
  height: '100%',
  playerVars: {
    showinfo: 0,
    autoplay: 1,
  },
};

const componentPropertyTypes = {
  //
};

const defaultProps = {
  //
};

class WatchFullVideo extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.playerRef = React.createRef();
    this.videoWrapperRef = React.createRef();

    this.state = {
      active: false,
      videoId: undefined,
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);

    WatchFullVideoEvents.onPlayVideo(this.onPlayVideo);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);

    WatchFullVideoEvents.offPlayVideo(this.onPlayVideo);
  }

  togglePlay = () => {
    if (this.player) {
      const currentState = this.player.getPlayerState();
      if (currentState === YOUTUBE_PLAYING || currentState === YOUTUBE_BUFFERING) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    }
  };

  onKeyDown = (event) => {
    if (!this.state.active || !this.player || !this.videoWrapperRef.current) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const currentTime = this.player.getCurrentTime();
      this.player.seekTo(currentTime - 5);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const currentTime = this.player.getCurrentTime();
      this.player.seekTo(currentTime + 5);
    }

    if (event.key === ' ') {
      event.preventDefault();
      this.togglePlay();
    }

    if (event.keyCode === 70 && event.shiftKey) {
      // Shift+F
      event.preventDefault();

      const iframe = this.videoWrapperRef.current.querySelector('iframe');
      const requestFullScreen =
        iframe.requestFullScreen || iframe.mozRequestFullScreen || iframe.webkitRequestFullScreen;

      if (requestFullScreen) {
        requestFullScreen.bind(iframe)();
      }
    }
  };

  onClose = () => {
    this.setState({ active: false, videoId: undefined });
    getAppContainer().style.overflow = '';
  };

  onPlayerReady = (event) => {
    this.player = event.target;
  };

  onPlayVideo = ({ videoId }) => {
    this.setState({
      active: true,
      videoId,
    });
  };

  render() {
    const { active, videoId } = this.state;

    if (active === false || !videoId) {
      return null;
    }

    return (
      <div ref={this.videoWrapperRef} className="watch-full-video">
        <CloseButton className="watch-full-video__close-button" onClick={this.onClose} />
        <YouTube onReady={this.onPlayerReady} ref={this.playerRef} videoId={videoId} opts={playerOptions} />
      </div>
    );
  }
}

export default WatchFullVideo;
