/* eslint-disable react/prefer-stateless-function */

import React from 'react';
import PropTypes from 'prop-types';

import throttle from 'lodash/throttle';

import { groupsType } from 'app/components/stories/stories.types';
import { storyPlayingFinished } from 'app/components/stories/stories.actions';
import getScrollTop from 'tools/get-scroll-top';
import getAppContainerHeight from 'tools/get-app-container-height';
import getScrollContainer from 'tools/get-scroll-container';
// import { id as currentUserIdType } from 'app/components/current-user/current-user.types';

class PlayLogger extends React.Component {
  static propTypes = {
    groups: groupsType.isRequired,
    videos: PropTypes.arrayOf(PropTypes.object).isRequired,
    playingGroup: PropTypes.number.isRequired,
    playingVideo: PropTypes.number.isRequired,
    dispatch: PropTypes.func.isRequired,
    // currentUserId: currentUserIdType.isRequired,
    stopVideo: PropTypes.func.isRequired,
    resumeVideo: PropTypes.func.isRequired,
    setKeydownListen: PropTypes.func.isRequired,
    getKeydownListen: PropTypes.func.isRequired,
    onFinishedStory: PropTypes.func.isRequired,
    playing: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.resumeOnScroll = false;
    this.disabledKeydownListen = false;
    this.enableKeydownListenOnResume = false;
    this.resumeOnVisibilityChange = false;
  }

  componentDidMount() {
    getScrollContainer().addEventListener('scroll', this.checkScroll);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  componentDidUpdate() {
    const { videos, playingVideo } = this.props;
    const group = this.getGroup();

    if (group && !group.played && group.has_new_games && videos.length > 0 && playingVideo + 1 === videos.length) {
      this.notifyBackend();
    }
  }

  componentWillUnmount() {
    getScrollContainer().removeEventListener('scroll', this.checkScroll);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  getGroup = () => {
    const { groups, playingGroup } = this.props;
    return groups[playingGroup];
  };

  /* eslint-disable-next-line react/sort-comp */
  checkScroll = throttle(() => {
    const { getKeydownListen, setKeydownListen, playing, stopVideo, resumeVideo } = this.props;

    const height = getAppContainerHeight();
    const top = getScrollTop();
    const scrolledDown = top > height / 2;

    if (scrolledDown && !this.disabledKeydownListen) {
      if (getKeydownListen()) {
        this.enableKeydownListenOnResume = true;
        this.disabledKeydownListen = true;
        setKeydownListen(false);
      } else {
        this.enableKeydownListenOnResume = false;
      }
    }

    if (!scrolledDown && this.disabledKeydownListen && this.enableKeydownListenOnResume) {
      setKeydownListen(true);
      this.disabledKeydownListen = false;
    }

    if (scrolledDown && playing) {
      this.resumeOnScroll = true;
      stopVideo();
    }

    if (!scrolledDown && !playing && this.resumeOnScroll) {
      this.resumeOnScroll = false;
      resumeVideo();
    }
  }, 100);

  handleVisibilityChange = () => {
    if (document.hidden && this.props.playing) {
      this.resumeOnVisibilityChange = true;
      this.props.stopVideo();
    } else if (!document.hidden && !this.props.playing && this.resumeOnVisibilityChange) {
      this.resumeOnVisibilityChange = false;
      this.props.resumeVideo();
    }
  };

  notifyBackend = () => {
    const { dispatch } = this.props;
    const group = this.getGroup();

    dispatch(storyPlayingFinished(group.id));

    this.props.onFinishedStory(group);
  };

  render() {
    return null;
  }
}

export default PlayLogger;
