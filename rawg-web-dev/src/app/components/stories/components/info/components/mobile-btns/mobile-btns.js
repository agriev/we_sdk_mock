import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import mutedIcon from 'assets/icons/mute-volume-control.svg';

// import { id as currentUserIdType } from 'app/components/current-user/current-user.types';

import './mobile-btns.styl';

const componentPropertyTypes = {
  onNextClick: PropTypes.func.isRequired,
  onPrevClick: PropTypes.func.isRequired,
  // onWishlistClick: PropTypes.func.isRequired,
  onPauseClick: PropTypes.func.isRequired,
  onMutedClick: PropTypes.func.isRequired,
  muted: PropTypes.bool.isRequired,
  // added: PropTypes.string,
  // currentUserId: currentUserIdType.isRequired,
};

const componentDefaultProperties = {
  // added: undefined,
};

const StoriesMobileBtns = ({
  onNextClick,
  onPrevClick,
  // onWishlistClick,
  onPauseClick,
  onMutedClick,
  muted,
  // added,
  // currentUserId,
}) => (
  <div className="stories__info__mobile-btns">
    <div className="stories__info__mobile-btns-wrap">
      <div className="stories__info__mobile-btns__prev" onClick={onPrevClick} role="button" tabIndex={0} />
      {/* {currentUserId && (
        <div
          className={cn('stories__info__mobile-btns__wishlist', {
            added,
            disabled: !currentUserId,
          })}
          onClick={currentUserId ? onWishlistClick : undefined}
          role="button"
          tabIndex={0}
        />
      )} */}
      <div className="stories__info__mobile-btns__pause" onClick={onPauseClick} role="button" tabIndex={0} />
      <div
        className={cn('stories__info__mobile-btns__mute', { muted })}
        onClick={onMutedClick}
        role="button"
        tabIndex={0}
      >
        <SVGInline svg={mutedIcon} />
      </div>
      <div className="stories__info__mobile-btns__next" onClick={onNextClick} role="button" tabIndex={0} />
    </div>
  </div>
);

StoriesMobileBtns.propTypes = componentPropertyTypes;
StoriesMobileBtns.defaultProps = componentDefaultProperties;

export default StoriesMobileBtns;
