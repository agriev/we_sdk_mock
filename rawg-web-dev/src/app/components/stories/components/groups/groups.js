import React, { Component } from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';
import truncate from 'lodash/truncate';
import SVGInline from 'react-svg-inline';
import memoize from 'fast-memoize';

import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import noop from 'lodash/noop';

import paths from 'config/paths';
import crop from 'tools/img/crop';

import appHelper from 'app/pages/app/app.helper';
import { loadNextGroupPage } from 'app/components/stories/stories.actions';

import { groupsType } from 'app/components/stories/stories.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import GroupsSlider from './components/groups-slider';
import GroupsMobile from './components/groups-mobile';

import { interfaceAlwaysActive } from '../info';

import playIcon from './assets/play.svg';

import './groups.styl';

const truncateOptions = {
  length: 23,
  // separator: ' ',
};

const propTypes = {
  groups: groupsType.isRequired,
  playingGroup: PropTypes.number.isRequired,
  // active: PropTypes.bool.isRequired,
  playing: PropTypes.bool.isRequired,
  onClickOnGroup: PropTypes.func.isRequired,
  currentUserId: currentUserIdType.isRequired,
  dispatch: PropTypes.func.isRequired,
  onMouseMove: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  size: appSizeType.isRequired,
};

const defaultProps = {
  onMouseEnter: noop,
  onMouseLeave: noop,
};

const HIDING_ON = true;
const VISIBILITY_TIMEOUT = 3000;

const isHidingAvailable = (size) => HIDING_ON && appHelper.isDesktopSize({ size });

class StoriesGroups extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  showGroupName = throttle(
    () => {
      if (!this.componentMounted) {
        return;
      }

      if (this.state.groupNameVisible === false) {
        this.setState({ groupNameVisible: true });
      }

      this.hideGroupName.cancel();
      this.hideGroupName();
    },
    200,
    { trailing: false },
  );

  hideGroupName = debounce(
    () => {
      if (this.state.groupNameVisible === true && this.componentMounted) {
        this.setState({ groupNameVisible: false });
      }
    },
    5000,
    { maxWait: 5000 },
  );

  constructor(props) {
    super(props);

    this.state = {
      groupNameVisible: false,
      isHidden: !interfaceAlwaysActive,
      timeoutId: null,
      prevPlayingValue: props.playing,
    };

    this.componentMounted = true;
    this.getBackground = memoize(this.getBackground);
  }

  componentDidMount() {
    if (isHidingAvailable(this.props.size)) {
      this.stories = document.querySelector('.stories__content');

      if (this.stories) {
        this.stories.addEventListener('mousemove', this.showSlider);
      }
    }
  }

  static getDerivedStateFromProps(props, state) {
    const { size, playing } = props;
    const { timeoutId } = state;

    if (isHidingAvailable(size) && state.prevPlayingValue !== playing) {
      if (!playing && timeoutId) {
        clearTimeout(timeoutId);
      }

      const newState = {
        prevPlayingValue: playing,
      };

      if (!playing) {
        newState.isHidden = false;
      }

      return newState;
    }

    return null;
  }

  componentDidUpdate(previousProperties) {
    const { size, playing } = this.props;

    if (isHidingAvailable(size) && !previousProperties.playing && playing) {
      this.showSlider();
    }
  }

  componentWillUnmount() {
    this.componentMounted = false;

    if (isHidingAvailable(this.props.size) && this.stories) {
      this.stories.removeEventListener('mousemove', this.showSlider);
    }
  }

  getBackground = (url) => {
    if (!url) {
      return undefined;
    }

    return {
      backgroundImage: `url('${crop(150, url)}')`,
    };
  };

  hideSliderAfterTimeout = () => {
    const { timeoutId } = this.state;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      this.hideSlider();
    }, VISIBILITY_TIMEOUT);

    this.setState({ timeoutId: newTimeoutId });
  };

  hideSlider = () => {
    this.setState({ isHidden: true });
  };

  showSlider = () => {
    if (this.props.playing) {
      this.setState({ isHidden: false });
      this.hideSliderAfterTimeout();
    }
  };

  loadGroups = () => {
    const { dispatch } = this.props;

    dispatch(loadNextGroupPage());
  };

  renderGroups() {
    const { groups, playingGroup, onClickOnGroup } = this.props;

    return groups.map((group, idx) => (
      <div className="stories__info__group-wrap" key={group.name}>
        <div className="stories__info__group-name">{truncate(group.name, truncateOptions)}</div>
        <Link
          to={paths.tldrStory(group.slug)}
          key={group.slug}
          className={cn('stories__info__group', {
            stories__info__group_active: playingGroup === idx,
            stories__info__group_new: group.has_new_games,
          })}
          onClick={onClickOnGroup(group.name, idx)}
        >
          <SVGInline className="stories__info__group__play-icon" svg={playIcon} />
          <div className="stories__info__group-background-1" style={this.getBackground(group.background)} />
          <div className="stories__info__group-background-2" />
        </Link>
      </div>
    ));
  }

  renderRegisterIfNeed() {
    const { currentUserId } = this.props;

    if (currentUserId) return null;

    return (
      <div className="stories__info__group-wrap">
        <div className="stories__info__group-name">
          <SimpleIntlMessage id="stories.signup" />
        </div>
        <Link
          to={paths.register}
          target="_blank"
          className="stories__info__group stories__info__group_signup"
          rel="nofollow"
        >
          <div className="stories__info__group-background-1" />
        </Link>
      </div>
    );
  }

  render() {
    // const { groupNameVisible } = this.state;
    const {
      groups,
      playingGroup,
      // active,
      // playing,
      size,
      onMouseMove,
      onMouseEnter,
      onMouseLeave,
    } = this.props;

    // const visible = !active && (groupNameVisible || !playing);
    const className = cn('stories__groups', {
      stories__groups_hidden: this.state.isHidden,
    });

    if (groups.length <= 0) {
      return <div className={className} />;
    }

    return (
      <div className={className}>
        {/* <div className="stories__groups__shadow" />
        <div className="stories__info__current-group-wrap">
          <div className={cn('stories__info__current-group', { visible })}>
            <div className="stories__info__current-group__icon">
              <SVGInline
                className="stories__info__current-group__play-icon"
                svg={playIcon}
              />
              <div
                className="stories__info__current-group-background-1"
                style={this.getBackground(groups[playingGroup].background)}
              />
              <div className="stories__info__current-group-background-2" />
            </div>
            <div className="stories__info__current-group-name">
              {truncate(groups[playingGroup].name, truncateOpts)}
            </div>
          </div>
        </div> */}
        {appHelper.isDesktopSize({ size }) ? (
          <GroupsSlider
            groups={this.renderGroups()}
            register={this.renderRegisterIfNeed()}
            playingGroup={playingGroup}
            size={size}
            loadGroups={this.loadGroups}
            onMouseMove={onMouseMove}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            showGroupName={this.showGroupName}
          />
        ) : (
          <GroupsMobile
            groups={this.renderGroups()}
            playingGroup={playingGroup}
            register={this.renderRegisterIfNeed()}
            loadGroups={this.loadGroups}
            showGroupName={this.showGroupName}
          />
        )}
      </div>
    );
  }
}

export default StoriesGroups;
