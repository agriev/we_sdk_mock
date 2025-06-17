import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import WatchFullVideoEvents from 'app/components/watch-full-video/watch-full-video.events';

import watchFullIcon from './assets/watch-full.svg';

import './watch-full-video-button.styl';

const propTypes = {
  videoId: PropTypes.string.isRequired,
  className: PropTypes.string,
  visible: PropTypes.bool.isRequired,
};

const defaultProps = {
  className: undefined,
};

const enabled = true;

const WatchFullVideoButton = ({ videoId, className, visible }) => {
  const onWatchBtnClick = useCallback(
    (event) => {
      event.stopPropagation();
      WatchFullVideoEvents.playVideo({ videoId });
    },
    [videoId],
  );

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={cn('watch-full-video-button', className, { visible })}
      onClick={onWatchBtnClick}
      role="button"
      tabIndex={0}
    >
      <SVGInline svg={watchFullIcon} />
      <FormattedMessage id="shared.watch-full" />
    </div>
  );
};

WatchFullVideoButton.propTypes = propTypes;
WatchFullVideoButton.defaultProps = defaultProps;

export default WatchFullVideoButton;
