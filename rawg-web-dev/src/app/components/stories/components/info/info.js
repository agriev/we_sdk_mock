/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import has from 'lodash/has';
// import SVGInline from 'react-svg-inline';

import keysEqual from 'tools/keys-equal';

import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

import appHelper from 'app/pages/app/app.helper';
import { setHeaderVisibility } from 'app/pages/app/app.actions';

import { platforms as platformsGameType, parent_platforms as parentPlatformsGameType } from 'app/pages/game/game.types';

import { groupsType } from 'app/components/stories/stories.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import Loading2 from 'app/ui/loading-2';

// import fullscreenIcon from './assets/fullscreen.svg';

import StoriesInfoTop from './components/top';
import StoriesMobileBtns from './components/mobile-btns';
import StoriesDesktopBtns from './components/desktop-btns';

import './info.styl';

export const interfaceAlwaysActive = true;

const propTypes = {
  platforms: platformsGameType,
  parent_platforms: parentPlatformsGameType,
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
  background_image: PropTypes.string,
  onNextClick: PropTypes.func.isRequired,
  onPrevClick: PropTypes.func.isRequired,
  onWishlistClick: PropTypes.func.isRequired,
  onPauseClick: PropTypes.func.isRequired,
  onMutedClick: PropTypes.func.isRequired,
  onWatchBtnClick: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  // onToggleFullscreenClick: PropTypes.func.isRequired,
  muted: PropTypes.bool.isRequired,
  added: PropTypes.string,
  groups: groupsType.isRequired,
  group: PropTypes.shape().isRequired,
  playingGroup: PropTypes.number.isRequired,
  currentUserId: currentUserIdType.isRequired,
  size: appSizeType.isRequired,
  video: PropTypes.shape(),
  firstPlay: PropTypes.bool.isRequired,
  embedded: PropTypes.bool.isRequired,
};

const defaultProps = {
  id: undefined,
  name: undefined,
  added: undefined,
  slug: undefined,
  background_image: undefined,
  platforms: undefined,
  parent_platforms: undefined,
  video: undefined,
};

class StoriesInfo extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.preparingToInactive = false;
    this.componentMounted = true;
    this.alwaysActive = false;
    this.state = {
      active: true,
    };
  }

  componentDidMount() {
    this.appHeaderEls = document.querySelectorAll('.header, .dropdown__container');
    for (const element in this.appHeaderEls) {
      if (has(this.appHeaderEls, element)) {
        this.appHeaderEls[element].addEventListener('mouseenter', this.onMouseEnter);
        this.appHeaderEls[element].addEventListener('mouseleave', this.onMouseLeave);
      }
    }
  }

  shouldComponentUpdate(nextProperties, nextState) {
    const propsIsDifferent = !keysEqual(this.props, nextProperties, [
      'name',
      'muted',
      'added',
      'playing',
      'groups.length',
      'group.loading',
      'playingGroup',
      'currentUserId',
      'size',
      'firstPlay',
    ]);

    const stateIsDifferent = !keysEqual(this.state, nextState, ['active']);

    return propsIsDifferent || stateIsDifferent;
  }

  componentWillUnmount() {
    this.componentMounted = false;
    this.props.dispatch(setHeaderVisibility(true));

    for (const element in this.appHeaderEls) {
      if (has(this.appHeaderEls, element)) {
        this.appHeaderEls[element].removeEventListener('mouseenter', this.onMouseEnter);
        this.appHeaderEls[element].removeEventListener('mouseleave', this.onMouseLeave);
      }
    }
  }

  onMouseMove = throttle(
    () => {
      if (!this.componentMounted) {
        return;
      }

      this.activateInterface();
    },
    200,
    { trailing: false },
  );

  onMouseEnter = () => {
    const { size } = this.props;
    if (appHelper.isDesktopSize({ size })) {
      this.setAlwaysActive(true);
    }
  };

  onMouseLeave = () => {
    const { size } = this.props;
    if (appHelper.isDesktopSize({ size })) {
      this.setAlwaysActive(false);
    }
  };

  setInactive = debounce(
    () => {
      if (this.state.active === true && this.componentMounted && this.alwaysActive === false) {
        this.setState({ active: false });
        this.props.dispatch(setHeaderVisibility(false));
      }
    },
    3000,
    { maxWait: 3000 },
  );

  activateInterface = () => {
    if (interfaceAlwaysActive) {
      return;
    }

    if (this.state.active === false) {
      this.setState({ active: true });
      this.props.dispatch(setHeaderVisibility(true));
    }

    this.setInactive.cancel();
    this.setInactive();
  };

  setAlwaysActive = (alwaysActive) => {
    this.alwaysActive = alwaysActive;
  };

  render() {
    const {
      id,
      name,
      slug,
      background_image,
      platforms,
      parent_platforms,
      muted,
      added,
      groups,
      group,
      playingGroup,
      onMutedClick,
      onNextClick,
      onPrevClick,
      onWishlistClick,
      onPauseClick,
      // onToggleFullscreenClick,
      onWatchBtnClick,
      currentUserId,
      size,
      video,
      firstPlay,
      embedded,
    } = this.props;

    const { active } = this.state;

    if (groups.length === 0) {
      return (
        <div className="stories__info-wrap loading">
          <Loading2 className="stories__info__loading" />
        </div>
      );
    }

    return (
      <div
        className={cn('stories__info-wrap', {
          active,
          'non-active': !active,
        })}
      >
        <div className="stories__info__group-title">
          <div className="stories__info__group-title__rawg-stories">RAWG TLDR</div>
          <div className="stories__info__group-title__text">{playingGroup >= 0 && group.name}</div>
        </div>

        {/* <div
          className="stories__info__fullscreen-btn"
          onClick={onToggleFullscreenClick}
          role="button"
          tabIndex={0}
        >
          <SVGInline svg={fullscreenIcon} />
        </div> */}

        <StoriesInfoTop
          group={group}
          id={id}
          name={name}
          slug={slug}
          background_image={background_image}
          muted={muted}
          added={added}
          onMutedClick={onMutedClick}
          onWishlistClick={onWishlistClick}
          onWatchBtnClick={onWatchBtnClick}
          platforms={platforms}
          parent_platforms={parent_platforms}
          currentUserId={currentUserId}
          size={size}
          video={video}
          buttonsVisibility={!firstPlay}
          embedded={embedded}
          loading={group.loading}
        />

        {!group.loading && (
          <>
            <StoriesMobileBtns
              onNextClick={onNextClick}
              onPrevClick={onPrevClick}
              onWishlistClick={onWishlistClick}
              onPauseClick={onPauseClick}
              onMutedClick={onMutedClick}
              muted={muted}
              added={added}
              currentUserId={currentUserId}
            />

            <StoriesDesktopBtns onNextClick={onNextClick} onPrevClick={onPrevClick} onPauseClick={onPauseClick} />
          </>
        )}
      </div>
    );
  }
}

export default StoriesInfo;
