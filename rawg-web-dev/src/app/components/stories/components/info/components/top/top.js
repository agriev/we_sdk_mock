/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose, withHandlers } from 'recompose';
import { Link } from 'app/components/link';
import { injectIntl } from 'react-intl';
import SVGInline from 'react-svg-inline';

import { platforms as platformsGameType, parent_platforms as parentPlatformsGameType } from 'app/pages/game/game.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

import { throwEvent } from 'scripts/analytics-helper';

import resize from 'tools/img/resize';
import intlShape from 'tools/prop-types/intl-shape';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import Platforms from 'app/ui/platforms';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import muteIcon from './assets/mute.svg';
import unMuteIcon from './assets/unmute.svg';

import watchFullIcon from '../../../../assets/watch-full.svg';

import './top.styl';

const hoc = compose(
  injectIntl,
  withHandlers({
    onGameNameClick: ({ group, name }) => () =>
      throwEvent({
        category: 'stories',
        action: 'open_game',
        label: `${group.name} -- ${name}`,
      }),
  }),
);

const componentPropertyTypes = {
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
  background_image: PropTypes.string,
  muted: PropTypes.bool.isRequired,
  added: PropTypes.string,
  onMutedClick: PropTypes.func.isRequired,
  onWishlistClick: PropTypes.func.isRequired,
  platforms: platformsGameType,
  parent_platforms: parentPlatformsGameType,
  currentUserId: currentUserIdType.isRequired,
  onGameNameClick: PropTypes.func.isRequired,
  onWatchBtnClick: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  video: PropTypes.shape(),
  buttonsVisibility: PropTypes.bool.isRequired,
  embedded: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,

  intl: intlShape.isRequired,
};

const componentDefaultProperties = {
  id: undefined,
  name: undefined,
  slug: undefined,
  background_image: undefined,
  platforms: undefined,
  parent_platforms: undefined,
  added: undefined,
  video: undefined,
};

const HIDING_ON = true;

const isHidingAvailable = (size) => HIDING_ON && appHelper.isDesktopSize({ size });
const isVisible = (size, buttonsVisibility) => !isHidingAvailable(size) || buttonsVisibility;

const StoriesInfoTopComponent = ({
  id,
  name,
  slug,
  background_image,
  muted,
  added,
  onMutedClick,
  onWishlistClick,
  platforms,
  parent_platforms,
  intl,
  currentUserId,
  onGameNameClick,
  onWatchBtnClick,
  video,
  size,
  buttonsVisibility,
  embedded,
  loading,
}) => {
  const isDesk = appHelper.isDesktopSize({ size });
  const NameEl = embedded ? 'div' : Link;

  return (
    <div className="stories__info__top">
      {background_image && (
        <div
          className="stories__info__top__avatar"
          style={{
            backgroundImage: `url(${resize(234, background_image)})`,
          }}
        />
      )}
      {slug && name && (
        <div className="stories__info__top__name-wrap">
          <NameEl onClick={onGameNameClick} target="_blank" to={paths.game(slug)} className="stories__info__top__name">
            {name || 'Loading…'}
          </NameEl>
        </div>
      )}
      {Array.isArray(platforms) && platforms.length > 0 && (
        <Platforms platforms={platforms} parentPlatforms={parent_platforms} size="medium" icons parents />
      )}
      <div className="flex-empty-space" />
      {isVisible(size, buttonsVisibility) && video && video.video && (
        <div className="stories__info__top__watch-full-btn" onClick={onWatchBtnClick} role="button" tabIndex={0}>
          <SVGInline svg={watchFullIcon} />
          <SimpleIntlMessage id="stories.watch-full" />
        </div>
      )}
      {isVisible(size, buttonsVisibility) && currentUserId && !loading && id && (
        <div
          className={cn('stories__info__top__wishlist-btn', {
            added: !!added,
            'not-added': !added,
            'not-added-to-another': added === undefined || added === 'toplay',
            'added-to-another': added && added !== 'toplay',
          })}
          onClick={onWishlistClick}
          role="button"
          tabIndex={0}
        >
          {isDesk && added === 'toplay' && <SimpleIntlMessage id="stories.added-to-wishlist" />}
          {isDesk && added && added !== 'toplay' && (
            <SimpleIntlMessage
              id="stories.added-to-another-list"
              values={{
                status: intl.formatMessage({
                  id: `shared.game_menu_status_${added}`,
                }),
              }}
            />
          )}
          {isDesk && !added && <SimpleIntlMessage id="stories.add-to-wishlist" />}
        </div>
      )}
      {isVisible(size, buttonsVisibility) && !loading && (
        <div
          className={cn('stories__info__top__muted-btn', { muted, 'not-muted': !muted })}
          onClick={onMutedClick}
          role="button"
          tabIndex={0}
        >
          <SVGInline svg={muteIcon} className="stories__info__top__muted-btn__icon-mute" />
          <SVGInline svg={unMuteIcon} className="stories__info__top__muted-btn__icon-unmute" />
          {muted && <SimpleIntlMessage id="stories.unmute" />}
          {!muted && <SimpleIntlMessage id="stories.mute" />}
        </div>
      )}
    </div>
  );
};

StoriesInfoTopComponent.propTypes = componentPropertyTypes;
StoriesInfoTopComponent.defaultProps = componentDefaultProperties;

const StoriesInfoTop = hoc(StoriesInfoTopComponent);

export default StoriesInfoTop;
