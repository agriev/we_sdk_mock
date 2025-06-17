import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import YouTube from 'react-youtube';
import memoizeOne from 'memoize-one';

import getAppContainer from 'tools/get-app-container';

import { YOUTUBE_PLAYING, YOUTUBE_BUFFERING } from 'tools/youtube/player-states';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import CloseButton from 'app/ui/close-button';
import { throwEvent } from 'scripts/analytics-helper';

import watchFullIcon from '../../assets/watch-full.svg';

import './watch-full.styl';

const playerOptions = memoizeOne((second) => ({
  width: '100%',
  height: '100%',
  playerVars: {
    showinfo: 0,
    autoplay: 1,
    start: second,
  },
}));

const componentPropertyTypes = {
  stopVideo: PropTypes.func.isRequired,
  resumeVideo: PropTypes.func.isRequired,
  getVideoEl: PropTypes.func.isRequired,
  headerVisible: PropTypes.bool.isRequired,
  second: PropTypes.number,
  playing: PropTypes.bool.isRequired,
  video: PropTypes.shape().isRequired,
  group: PropTypes.shape().isRequired,
  setKeydownListen: PropTypes.func.isRequired,
};

const defaultProps = {
  second: 0,
};

class StoriesWatchFull extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.playerRef = React.createRef();
    this.videoWrapperRef = React.createRef();

    this.needResumeVideo = false;
    this.keydownListenEnabled = false;

    this.state = {
      active: false,
      second: this.props.second,
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  setKeydownListen = (value) => {
    this.keydownListenEnabled = value;
  };

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
    if (!this.keydownListenEnabled || !this.player || !this.videoWrapperRef.current) {
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
    this.setState({ active: false });
    getAppContainer().style.overflow = '';

    if (this.needResumeVideo) {
      this.props.resumeVideo();
    }

    this.props.setKeydownListen(true);
    this.setKeydownListen(false);
  };

  onWatchBtnClick = () => {
    const { playing, second, stopVideo, getVideoEl, setKeydownListen, video } = this.props;

    if (!video || !video.video) {
      return;
    }

    getAppContainer().style.overflow = 'hidden';

    const time = getVideoEl().currentTime();

    this.setState({ active: true, second: Math.round(second + time) });
    stopVideo();

    setKeydownListen(false);
    setTimeout(() => {
      this.setKeydownListen(true);
    }, 100);

    this.needResumeVideo = playing;
    this.watchFullEvent();
  };

  onPlayerReady = (event) => {
    this.player = event.target;
  };

  watchFullEvent = () => {
    const { video, group } = this.props;

    if (video) {
      throwEvent({
        category: 'stories',
        action: 'open_full',
        label: `${group.name} -- ${video.game.name}`,
      });
    }
  };

  render() {
    const { active, second } = this.state;
    const { video, headerVisible } = this.props;

    if (!video || !video.video) {
      return null;
    }

    return (
      <>
        <div className={cn('stories__info__watch-full-wrap', { active: headerVisible })}>
          <div className="stories__info__watch-full" onClick={this.onWatchBtnClick} role="button" tabIndex={0}>
            <SVGInline svg={watchFullIcon} />
            <SimpleIntlMessage id="stories.watch-full" />
          </div>
        </div>
        {active && (
          <div ref={this.videoWrapperRef} className="stories__info__watch-full__window">
            <CloseButton className="stories__info__watch-full__close-button" onClick={this.onClose} />
            <YouTube
              onReady={this.onPlayerReady}
              ref={this.playerRef}
              videoId={video.video}
              opts={playerOptions(second)}
            />
          </div>
        )}
      </>
    );
  }
}

export default StoriesWatchFull;
