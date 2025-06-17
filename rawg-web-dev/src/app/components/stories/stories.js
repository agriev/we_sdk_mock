/* eslint-disable jsx-a11y/media-has-caption, no-mixed-operators */
/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import cn from 'classnames';
import memoize from 'fast-memoize';
import urlParse from 'url-parse';

import { throttle, keys, get } from 'lodash';

import { always, evolve, update, not, defaultTo } from 'ramda';

import { inputs } from 'tools/html/inputs';
import fetch from 'tools/fetch';
import getFetchState, { fetchStateType } from 'tools/get-fetch-state';

import storiesType from 'app/components/stories/stories.types';
import { appRatingsType, appSizeType, headerVisible as headerVisibleType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

import Loading2 from 'app/ui/loading-2';

import { throwEvent } from 'scripts/analytics-helper';
import { removeGameStatus, createGameStatus } from 'app/components/game-menu-collections/game-menu.actions';

import checkLogin from 'tools/check-login';
import getCurrentUrl from 'tools/get-current-url';

import { updateSetting } from 'app/components/current-user/current-user.actions';
import { loadGroup } from 'app/components/stories/stories.actions';
import RenderMounted from 'app/render-props/render-mounted';

import { currentUserIdType, settingsType } from 'app/components/current-user/current-user.types';

import StoriesProgressBars from './components/progressbars';
import StoriesInfo, { interfaceAlwaysActive } from './components/info';
// import StoriesInfoNotifBottomBar from './components/notif-bottom-bar';
// import StoriesPreloader from './components/preloader';
import StoriesWatchFull from './components/watch-full';
import PlayLogger from './components/play-logger';
import AnalyticsLogger from './components/analytics-logger';
// import reactOnOrientation from './tools/react-on-orientation';
import StoriesGroups from './components/groups';

import { determineImplementation, getPlayingState, getVideos } from './stories.helpers';

import './stories.styl';

const wishlistStatus = 'toplay';

@hot(module)
@connect((state) => ({
  fetchState: getFetchState(state),
  stories: state.stories,
  ratings: state.app.ratings,
  query: state.app.request.query,
  size: state.app.size,
  currentUserId: state.currentUser.id,
  currentUserSettings: state.currentUser.settings,
  headerVisible: state.app.headerVisible,
}))
class Stories extends React.Component {
  static propTypes = {
    // Внешние пропсы
    embedded: PropTypes.bool,
    autoPlayOnViewport: PropTypes.bool,
    lang: PropTypes.string,

    // Подключаемые внутренним кодом пропсы
    fetchState: fetchStateType.isRequired,
    stories: storiesType.isRequired,
    ratings: appRatingsType.isRequired,
    query: PropTypes.shape().isRequired,
    size: appSizeType.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUserId: currentUserIdType.isRequired,
    currentUserSettings: settingsType,
    headerVisible: headerVisibleType.isRequired,
  };

  static defaultProps = {
    currentUserSettings: undefined,
    lang: undefined,
    embedded: false,
    autoPlayOnViewport: false,
  };

  startPlayingAfterLoad = false;

  startPlayingOnViewport = false;

  constructor(props) {
    super(props);

    let playingGroup = 0;

    const { query, stories, size, currentUserSettings } = this.props;

    const isDesktop = appHelper.isDesktopSize({ size });

    const muted = isDesktop || get(currentUserSettings, this.getMutedSettingKey(), false);

    if (query.group) {
      playingGroup = stories.groups.findIndex((element) => element.slug === query.group);
    }

    this.storiesInfoRef = React.createRef();
    this.storiesContentRef = React.createRef();
    this.watchFullRef = React.createRef();
    this.progressBarsRef = React.createRef();

    this.finishedStories = {};
    this.finishedClips = {};
    this.playStartTime = undefined;
    this.playedSeconds = -1;
    this.statsSended = false;

    this.startPlayingOnViewport = this.props.autoPlayOnViewport;
    this.keydownListenEnabled = true;
    this.videoElements = {};
    this.state = {
      muted,
      playingGroup,
      playingVideo: 0,
      playing: false,
      firstPlay: true,
      prevSize: size,
      ...determineImplementation({ size, query }),
    };

    this.videoRef = memoize(this.videoRef);
    this.onClickOnGroup = memoize(this.onClickOnGroup);

    this.sendPlayingEvent = throttle(this.sendPlayingEventOrg, 1000, {
      leading: true,
      trailing: false,
    });
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('focus', this.onFocus, true);
    window.addEventListener('blur', this.onBlur, true);
    window.addEventListener('dblclick', this.onDoubleClick, true);
    window.addEventListener('beforeunload', this.sendPlayingStats);

    this.keydownListenEnabled = !inputs.includes(document.activeElement.tagName);

    const { size, stories, currentUserId, embedded } = this.props;

    const { groups } = stories;
    const { playingGroup } = this.state;

    this.progressBarsRef.current.setBars(getVideos({ size, groups, playingGroup }).map(always(0)));

    if (appHelper.isDesktopSize({ size }) && !currentUserId && !embedded) {
      this.playVideo();
    }

    if (appHelper.isPhoneSize({ size })) {
      // this.reactOnOrientation = reactOnOrientation();
      // window.addEventListener('deviceorientation', this.onDeviceOrientation);
    }
  }

  componentDidUpdate(previousProperties) {
    /* eslint-disable react/no-did-update-set-state */
    const { size, stories, currentUserId } = this.props;

    const isDesktop = appHelper.isDesktopSize({ size });
    const { groups } = stories;
    const { playingGroup } = this.state;

    if (previousProperties.stories.groups.length === 0 && this.props.stories.groups.length > 0) {
      this.setState(
        getPlayingState({
          playingGroup,
          size,
          groups,
          setBars: this.progressBarsRef.current.setBars,
        }),
        () => {
          if (isDesktop && !currentUserId) {
            this.playVideo();
          }
        },
      );
    }

    if (
      playingGroup >= 0 &&
      previousProperties.stories.groups[playingGroup] &&
      !previousProperties.stories.groups[playingGroup].videos &&
      !!this.props.stories.groups[playingGroup].videos
    ) {
      this.progressBarsRef.current.setBars(getVideos({ size, groups, playingGroup }).map(always(0)));

      if (this.startPlayingAfterLoad) {
        this.startPlayingAfterLoad = false;
        this.playVideo();
      }
    }

    if (previousProperties.stories.groups.length === 0 && this.props.stories.groups.length > 0) {
      this.progressBarsRef.current.setBars(getVideos({ size, groups, playingGroup }).map(always(0)));
    }
  }

  componentWillUnmount() {
    const { size } = this.props;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('focus', this.onFocus, true);
    window.removeEventListener('blur', this.onBlur, true);
    window.removeEventListener('dblclick', this.onDoubleClick, true);
    window.removeEventListener('beforeunload', this.sendPlayingStats);

    if (appHelper.isPhoneSize({ size })) {
      // window.removeEventListener('deviceorientation', this.onDeviceOrientation);
      // this.reactOnOrientation.stop();
    }

    this.sendPlayingStats();
  }

  static getDerivedStateFromProps(props, state) {
    const { size, query } = props;
    const { prevSize } = state;

    if (prevSize !== size) {
      return {
        prevSize: size,
        ...determineImplementation({ size, query }),
      };
    }

    return null;
  }

  getMutedSettingKey = () => {
    const { size } = this.props;

    return appHelper.isDesktopSize({ size }) ? 'stories.muted.desktop' : 'stories.muted.phone';
  };

  setKeydownListen = (value) => {
    this.keydownListenEnabled = value;
  };

  getKeydownListen = () => this.keydownListenEnabled;

  onDeviceOrientation = (event) => {
    this.reactOnOrientation.listener(event);
  };

  onVideoMouseEnter = () => {
    // if (this.state.playingVideo >= 0) {
    //   this.getVideoEl().play();
    // }
  };

  onVideoMouseLeave = () => {
    // if (this.state.playingVideo >= 0) {
    //   this.getVideoEl().pause();
    // }
  };

  onVideoLeftClick = (event) => {
    event.stopPropagation();

    const { playing } = this.state;
    const { clientX, changedTouches } = event;
    const { clientWidth, offsetLeft } = this.storiesContentRef.current;
    const pos = (clientX || changedTouches[0].pageX) - offsetLeft;
    const center = clientWidth / 2;
    const isCLickOnMiddle = pos > center - 100 && pos < center + 100;

    if (!playing || isCLickOnMiddle) {
      this.togglePlay();
    } else if (pos <= center - 100) {
      this.startPrevClip();
    } else if (pos >= center + 100) {
      this.skipVideoEvent();
      this.startNextClip();
    }
  };

  onVideoRightClick = (event) => {
    event.preventDefault();

    this.togglePlay();
  };

  onVideoEnded = () => {
    const video = this.getVideo();

    if (video) {
      this.finishedClips[video.video] = true;
    }

    this.startNextClip();
  };

  onDoubleClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
  };

  onMutedClick = () => {
    const { dispatch, currentUserId } = this.props;

    this.setState((state) => {
      const { playingGroup, playingVideo } = this.state;
      if (playingGroup >= 0 && playingVideo >= 0) {
        const group = this.getGroup();
        const video = this.getVideo();

        if (video.game) {
          throwEvent({
            category: 'stories',
            action: state.muted ? 'unmute' : 'mute',
            label: `${group.name} -- ${video.game.name}`,
          });
        }
      }

      if (currentUserId) {
        dispatch(updateSetting(this.getMutedSettingKey(), !state.muted));
      }

      return evolve({ muted: not }, state);
    });

    const { playing } = this.state;
    const { size } = this.props;

    if (!playing && appHelper.isPhoneSize({ size })) {
      this.togglePlay();
    }
  };

  onClickOnGroup = (groupName, groupIdx) => (event) => {
    event.preventDefault();

    throwEvent({
      category: 'stories',
      action: 'circle',
      label: groupName,
    });

    this.changeGroup(groupIdx);
  };

  onWishlistClick = () => {
    const { playingGroup, playingVideo } = this.state;
    const { dispatch, stories, currentUserId } = this.props;

    const { game } = get(stories, `groups[${playingGroup}].videos[${playingVideo}]`);

    if (!game || !currentUserId) {
      return;
    }

    const { user_game } = game;

    checkLogin(dispatch, async () => {
      if (user_game === null) {
        this.wishlickAddEvent();
        await dispatch(createGameStatus({ game, status: wishlistStatus }));
      } else if (user_game.status === wishlistStatus) {
        await dispatch(removeGameStatus({ game }));
      }
    });
  };

  onMouseMove = (onlyOnDesktop = true) => {
    if (onlyOnDesktop) {
      const { size } = this.props;
      if (appHelper.isDesktopSize({ size })) {
        this.storiesInfoRef.current.onMouseMove();
      }
    } else {
      this.storiesInfoRef.current.onMouseMove();
    }
  };

  onPlayError = (error, videoIdx) => {
    const { playingVideo } = this.state;

    if (playingVideo === videoIdx) {
      this.setState({ playing: false });
    }
  };

  onKeyDown = (event) => {
    if (!this.keydownListenEnabled) {
      return;
    }

    const { playingGroup } = this.state;
    const { groups } = this.props.stories;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      if (event.shiftKey) {
        if (playingGroup > 0) {
          this.changeGroup(playingGroup - 1);
        } else {
          this.changeGroup(groups.length - 1);
        }
      } else {
        this.startPrevClip();
      }
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();

      if (event.shiftKey) {
        if (playingGroup < groups.length - 1) {
          this.changeGroup(playingGroup + 1);
        } else {
          this.changeGroup(0);
        }
      } else {
        this.skipVideoEvent();
        this.startNextClip();
      }
    }

    if (event.key === ' ') {
      event.preventDefault();
      this.togglePlay();
    }

    if (event.keyCode === 87 && event.shiftKey) {
      // Shift+W
      event.preventDefault();
      this.onWishlistClick();
    }

    if (event.keyCode === 77 && event.shiftKey) {
      // Shift+M
      event.preventDefault();
      this.onMutedClick();
    }

    if (event.keyCode === 70 && event.shiftKey) {
      // Shift+F
      event.preventDefault();

      this.onWatchBtnClick();
    }
  };

  onFocus = (event) => {
    if (inputs.includes(event.target.tagName)) {
      this.setKeydownListen(false);
    }
  };

  onBlur = (event) => {
    if (inputs.includes(event.target.tagName)) {
      this.setKeydownListen(true);
    }
  };

  onShow = () => {
    if (this.startPlayingOnViewport) {
      this.playVideo();
      this.startPlayingOnViewport = false;
    }
  };

  onNextClick = () => {
    this.skipVideoEvent();
    this.startNextClip();
  };

  onPrevClick = () => {
    this.startPrevClip();
  };

  onFinishedStory = (group) => {
    this.finishedStories[group.id] = true;
  };

  onToggleFullscreenClick = () => {
    this.getVideoEl().toggleFullscreen();
  };

  onWatchBtnClick = () => {
    if (this.watchFullRef.current) {
      this.watchFullRef.current.onWatchBtnClick();
    }
  };

  sendPlayingStats = () => {
    if (this.statsSended || this.playStartTime === undefined) {
      return;
    }

    throwEvent({
      category: 'stories',
      action: 'finished_stories',
      value: keys(this.finishedStories).length,
    });

    throwEvent({
      category: 'stories',
      action: 'finished_clips',
      value: keys(this.finishedClips).length,
    });

    throwEvent({
      category: 'stories',
      action: 'finished_seconds',
      value: this.playedSeconds,
    });

    this.statsSended = true;
  };

  skipVideoEvent = () => {
    const { playingGroup, playingVideo } = this.state;
    if (playingGroup >= 0 && playingVideo >= 0) {
      const group = this.getGroup();
      const video = this.getVideo();
      const videoElement = this.getVideoEl();

      if (video.game) {
        throwEvent({
          category: 'stories',
          action: 'skip',
          label: `${group.name} -- ${video.game.name}`,
          value: Math.round(videoElement.currentTime()),
        });
      }
    }
  };

  wishlickAddEvent = () => {
    const { playingGroup, playingVideo } = this.state;

    if (playingGroup >= 0 && playingVideo >= 0) {
      const group = this.getGroup();
      const video = this.getVideo();

      if (video.game) {
        throwEvent({
          category: 'stories',
          action: 'add_to_whishlist',
          label: `${group.name} -- ${video.game.name}`,
        });
      }
    }
  };

  getVideoEl = () => this.videoElements[`${this.state.playingGroup}.${this.state.playingVideo}`];

  getVideos = (playingGroupArgument) => {
    const { size } = this.props;
    const { groups } = this.props.stories;
    const playingGroup = defaultTo(this.state.playingGroup, playingGroupArgument);

    return getVideos({ size, groups, playingGroup });
  };

  getVideo = () => this.getVideos()[this.state.playingVideo] || {};

  getGroup = () => this.props.stories.groups[this.state.playingGroup] || {};

  startNextClip = () => {
    const { playingGroup, playingVideo } = this.state;
    const { groups } = this.props.stories;

    if (playingVideo >= this.getVideos().length - 1) {
      if (playingGroup < groups.length - 1) {
        this.changeGroup(playingGroup + 1);
      } else {
        this.changeGroup(0);
      }

      return;
    }

    this.setState((state) => {
      const videos = this.getVideos();
      const progressBarUpdates = [];
      const nextState = {
        playingVideo: state.playingVideo,
      };

      if (nextState.playingVideo > -1) {
        this.stopVideo(false);
        progressBarUpdates.push(update(nextState.playingVideo, 100));
      } else {
        progressBarUpdates.push(() => videos.map(always(0)));
      }

      nextState.playingVideo += 1;
      progressBarUpdates.push(update(nextState.playingVideo, 0));

      this.progressBarsRef.current.updateBars(progressBarUpdates);

      return evolve(
        {
          playingVideo: always(nextState.playingVideo),
        },
        state,
      );
    }, this.playVideo);
  };

  startPrevClip = () => {
    const { playingGroup, playingVideo } = this.state;
    const { groups } = this.props.stories;

    if (playingVideo <= 0) {
      if (playingGroup > 0) {
        this.changeGroup(playingGroup - 1);
      } else {
        this.changeGroup(groups.length - 1);
      }

      return;
    }

    this.setState((state) => {
      const videos = this.getVideos();
      const progressBarUpdates = [];
      const nextState = {
        playingVideo: state.playingVideo,
      };

      if (nextState.playingVideo < videos.length) {
        this.stopVideo(false);
        progressBarUpdates.push(update(nextState.playingVideo, 0));
      } else {
        progressBarUpdates.push(() => videos.map(always(0)));
      }

      nextState.playingVideo -= 1;
      progressBarUpdates.push(update(nextState.playingVideo, 0));

      this.progressBarsRef.current.updateBars(progressBarUpdates);

      return evolve(
        {
          playingVideo: always(nextState.playingVideo),
        },
        state,
      );
    }, this.playVideo);
  };

  startNClip = (idx) => {
    this.setState(
      () => {
        const { playingVideo, playingGroup } = this.state;
        const { stories, size } = this.props;
        const { groups } = stories;

        if (playingVideo > -1) {
          this.stopVideo(false);
        }

        return getPlayingState({
          playingVideo: idx,
          playingGroup,
          size,
          groups,
          setBars: this.progressBarsRef.current.setBars,
        });
      },
      this.state.playerImpl === 'video.js' ? this.playVideoDelayed : this.playVideo,
    );
  };

  setPlaying = (playing) => {
    if (this.state.firstPlay) {
      throwEvent({ category: 'stories', action: 'start_story' });
      throwEvent({ category: 'stories', action: 'start_clip' });
      this.onMouseMove();
      this.playStartTime = new Date();
    }

    this.setState({ playing, firstPlay: false });
  };

  playVideo = (withDelay = false) => {
    const video = this.getVideoEl();

    if (video && video.paused()) {
      if (video.currentTime() > 0) {
        video.currentTime(0);
      }

      if (withDelay) {
        setTimeout(video.play, 100);
      } else {
        video.play();
      }
    }
  };

  // eslint-disable-next-line react/sort-comp
  playVideoDelayed = this.playVideo.bind(this, true);

  resumeVideo = () => {
    const video = this.getVideoEl();
    if (video && video.paused()) {
      video.play();
    }
  };

  stopVideo = (changeState = true) => {
    const video = this.getVideoEl();
    if (video && !video.paused()) {
      video.pause();
    }

    if (changeState) {
      this.setState({ playing: false });
    }
  };

  togglePlay = () => {
    this.onMouseMove(false);
    const { playingVideo } = this.state;
    const videoElement = this.getVideoEl();
    if (videoElement) {
      if (videoElement.paused()) {
        throwEvent({ category: 'stories', action: 'resume' });
        videoElement.play();
      } else {
        throwEvent({ category: 'stories', action: 'pause' });
        videoElement.pause();
        this.setState({ playing: false });
      }
    } else if (playingVideo === -1) {
      this.startNextClip();
    }
  };

  videoRef = ({ groupIdx, videoIdx }) => (element) => {
    this.videoElements[`${groupIdx}.${videoIdx}`] = element;
  };

  resetVideoElements = () => {
    this.videoElements = {};
  };

  onTimeUpdate = () => {
    this.updateProgressBars();
    this.sendPlayingEvent();
  };

  sendPlayingEventOrg = () => {
    const { fetchState: state } = this.props;
    const video = this.getVideoEl();

    if (!video) {
      return;
    }

    this.playedSeconds += 1;

    if (this.playedSeconds % 5 === 0) {
      const domain = this.props.query.in || urlParse(getCurrentUrl()).hostname;

      fetch('/api/stat/story', {
        method: 'post',
        state,
        parse: false,
        data: {
          second: this.playedSeconds,
          domain,
        },
      });
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  updateProgressBars = throttle(
    () => {
      if (this.state.playingVideo >= 0) {
        const videoElement = this.getVideoEl();
        if (videoElement) {
          const percentage = Math.floor((100 / videoElement.duration()) * videoElement.currentTime());
          if (percentage) {
            this.progressBarsRef.current.updateBars([update(this.state.playingVideo, percentage)]);
          }
        }
      }
    },
    50,
    { trailing: false },
  );

  getCurrentVideos = (allVideos) => {
    const { groups } = this.props.stories;
    const { playingVideo, firstPlay } = this.state;
    const { playingGroup } = this.state;
    const toObject = (videoObject, videoIdx) => ({
      groupIdx: playingGroup,
      videoIdx,
      videoObject,
    });

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const results = allVideos.map(toObject).filter(({ videoIdx }) => {
      const current = playingVideo === videoIdx;
      const previous = playingVideo - 1 === videoIdx && !firstPlay;
      const next = playingVideo + 1 === videoIdx && !firstPlay;

      return current || previous || next;
    });

    // Делаем подгрузку первого видео из следующей группы тылдыров
    if (allVideos.length > 0 && playingVideo >= allVideos.length - 2 && playingGroup < groups.length - 1) {
      const nextGroup = groups[playingGroup + 1];
      if (!nextGroup.videos) {
        this.props.dispatch(
          loadGroup({
            slug: nextGroup.slug,
            lang: this.props.lang,
          }),
        );
      }
    }

    if (allVideos.length >= 0 && playingVideo >= allVideos.length - 1 && playingGroup < groups.length - 1) {
      const nextGroup = groups[playingGroup + 1];
      if (nextGroup.videos) {
        results.push({
          videoObj: groups[playingGroup + 1].videos[0],
          groupIdx: playingGroup + 1,
          videoIdx: 0,
        });
      }
    }

    return results;
  };

  changeGroup(playingGroup) {
    this.stopVideo(false);

    const { stories, size } = this.props;
    const { groups } = stories;

    this.setState(
      getPlayingState({
        size,
        playingGroup,
        groups,
        setBars: this.progressBarsRef.current.setBars,
      }),
      async () => {
        const video = this.getVideoEl();
        const group = this.props.stories.groups[playingGroup];

        if (video === undefined) {
          this.stopVideo(true);
          this.startPlayingAfterLoad = true;
          await this.props.dispatch(
            loadGroup({
              slug: group.slug,
              lang: this.props.lang,
            }),
          );
          return;
        }

        if (this.state.playerImpl === 'video.js') {
          this.playVideoDelayed();
        } else {
          this.playVideo();
        }
      },
    );
  }

  render() {
    const { dispatch, ratings, stories, currentUserId, headerVisible, size, embedded } = this.props;
    const { groups } = stories;
    const { playingVideo, playingGroup, muted, playing, firstPlay } = this.state;
    const videos = this.getVideos();
    const video = this.getVideo();
    const group = this.getGroup();
    const game = get(video, 'game') || {};
    const { id, name, slug, background_image, released, platforms, parent_platforms, rating_top } = game;
    const rating = ratings.find((r) => r.id === rating_top);
    const added = get(game, 'user_game.status');
    const currentVideos = this.getCurrentVideos(videos);

    const { Player } = this.state;

    return (
      <RenderMounted rootMargin="0px 0px 0px 0px" onShow={this.onShow} onHide={this.onHide}>
        {({ onChildReference }) => (
          <>
            <div className="stories__content-wrap" ref={(element) => onChildReference(element)}>
              <div
                ref={this.storiesContentRef}
                className={cn('stories__content', {
                  playing,
                  paused: !playing,
                  'first-play': firstPlay,
                  'non-first-play': !firstPlay,
                })}
                onMouseMove={this.onMouseMove}
                onTouchMove={this.onMouseMove}
                onTouchStart={this.onMouseMove}
              >
                <StoriesProgressBars
                  ref={this.progressBarsRef}
                  playingVideo={playingVideo}
                  onClickOnBar={this.startNClip}
                  headerVisible={headerVisible}
                />
                {groups.length > 0 && (
                  <>
                    <div className="stories__content__video-previews">
                      {videos.map((videoObject) => (
                        <img key={videoObject.preview} alt="video preview" src={videoObject.preview} />
                      ))}
                    </div>

                    <PlayLogger
                      groups={groups}
                      videos={videos}
                      playingVideo={playingVideo}
                      playingGroup={playingGroup}
                      dispatch={dispatch}
                      currentUserId={currentUserId}
                      resumeVideo={this.resumeVideo}
                      stopVideo={this.stopVideo}
                      setKeydownListen={this.setKeydownListen}
                      getKeydownListen={this.getKeydownListen}
                      playing={playing}
                      onFinishedStory={this.onFinishedStory}
                    />
                    <AnalyticsLogger
                      groups={groups}
                      playingVideo={playingVideo}
                      playingGroup={playingGroup}
                      playing={playing}
                    />
                    <div className="stories__videos-shadow" />
                    <div className="stories__videos">
                      {currentVideos.length === 0 && <Loading2 />}
                      {currentVideos.map(({ groupIdx, videoIdx, videoObject }) => (
                        <Player
                          key={videoObject.url}
                          ref={this.videoRef({ groupIdx, videoIdx })}
                          autoplay={false}
                          preload="auto"
                          forcePreload
                          hidden={playingVideo !== videoIdx}
                          src={videoObject.url}
                          videoIdx={videoIdx}
                          onMouseEnter={this.onVideoMouseEnter}
                          onMouseLeave={this.onVideoMouseLeave}
                          onClick={this.onVideoLeftClick}
                          onContextMenu={this.onVideoRightClick}
                          onTimeUpdate={this.onTimeUpdate}
                          onEnded={this.onVideoEnded}
                          onPlayError={this.onPlayError}
                          muted={muted}
                          setPlaying={this.setPlaying}
                          size={size}
                          poster={videoObject.preview}
                        />
                      ))}
                    </div>

                    <StoriesWatchFull
                      ref={this.watchFullRef}
                      second={get(groups, `[${playingGroup}].videos[${playingVideo}].second`)}
                      stopVideo={this.stopVideo}
                      resumeVideo={this.resumeVideo}
                      headerVisible={headerVisible}
                      getVideoEl={this.getVideoEl}
                      playing={playing}
                      group={group}
                      video={video}
                      setKeydownListen={this.setKeydownListen}
                    />
                  </>
                )}

                <StoriesInfo
                  ref={this.storiesInfoRef}
                  rating={rating}
                  released={released}
                  platforms={platforms}
                  parent_platforms={parent_platforms}
                  id={id}
                  name={name}
                  slug={slug}
                  background_image={background_image}
                  muted={muted}
                  added={added}
                  onNextClick={this.onNextClick}
                  onPrevClick={this.onPrevClick}
                  onWishlistClick={this.onWishlistClick}
                  onPauseClick={this.togglePlay}
                  onMutedClick={this.onMutedClick}
                  onToggleFullscreenClick={this.onToggleFullscreenClick}
                  onWatchBtnClick={this.onWatchBtnClick}
                  groups={groups}
                  group={group}
                  playingGroup={playingGroup}
                  currentUserId={currentUserId}
                  dispatch={dispatch}
                  stopVideo={this.stopVideo}
                  resumeVideo={this.resumeVideo}
                  size={size}
                  video={video}
                  firstPlay={firstPlay}
                  embedded={embedded}
                />
              </div>
              {/* <StoriesInfoNotifBottomBar /> */}
            </div>
            <StoriesGroups
              groups={groups}
              playingGroup={playingGroup}
              playing={playing}
              onClickOnGroup={this.onClickOnGroup}
              currentUserId={currentUserId}
              dispatch={dispatch}
              onMouseMove={interfaceAlwaysActive ? this.onMouseMove : undefined}
              size={size}
              active
            />
          </>
        )}
      </RenderMounted>
    );
  }
}

export default Stories;
