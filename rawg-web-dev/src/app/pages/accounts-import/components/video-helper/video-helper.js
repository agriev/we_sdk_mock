import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import YouTube from 'react-youtube';

import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import AspectRatioContainer16x9 from 'app/ui/aspect-ratio-container-16x9';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import TruncateBlockByHeight from 'app/ui/truncate-block-by-height';

import './video-helper.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  playerOptions: PropTypes.shape({}),
  size: appSizeType.isRequired,
  videoId: PropTypes.string.isRequired,
  messages: PropTypes.shape({
    title: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
};

const defaultProps = {
  className: '',
  playerOptions: {
    width: '100%',
    height: '100%',
    playerVars: {
      showinfo: 0,
      autoplay: 1,
      mute: 1,
    },
  },
};

const VideoHelperComponent = ({ className, size, videoId, playerOptions, messages }) => (
  <div className={['video-helper', className].join(' ')}>
    <AspectRatioContainer16x9 className="video-helper__video">
      <YouTube videoId={videoId} opts={playerOptions} />
    </AspectRatioContainer16x9>
    <SimpleIntlMessage id={messages.title} className="video-helper__help-title" />
    {appHelper.isDesktopSize({ size }) ? (
      <SimpleIntlMessage id={messages.text} className="video-helper__help-text" />
    ) : (
      <TruncateBlockByHeight phone maxHeight={28} className="video-helper__read-more">
        <SimpleIntlMessage id={messages.text} className="video-helper__help-text" />
      </TruncateBlockByHeight>
    )}
  </div>
);

VideoHelperComponent.propTypes = componentPropertyTypes;
VideoHelperComponent.defaultProps = defaultProps;

const VideoHelper = hoc(VideoHelperComponent);

export default VideoHelper;
