import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { onlyUpdateForKeys } from 'recompose';

import YoutubeVideoList from 'app/ui/youtube-video-list';
import Heading from 'app/ui/heading';

import './most-watched-videos.styl';

const connector = connect((state) => ({
  videos: state.showcase.mostWatchedVideos.results,
}));

const updater = onlyUpdateForKeys(['videos']);

const componentPropertyTypes = {
  videos: PropTypes.arrayOf(PropTypes.shape()),
};

const defaultProps = {
  videos: [],
};

const ShowcaseMostWatchedVideos = (props) => {
  const { videos } = props;

  if (!videos || videos.length === 0) return null;

  return (
    <div className="showcase-most-watched-videos">
      <Heading rank={2} centred>
        <FormattedMessage id="showcase.most-watched-videos_title" />
        <div className="showcase-most-watched-videos__youtube" />
      </Heading>
      <YoutubeVideoList videos={videos} />
    </div>
  );
};

ShowcaseMostWatchedVideos.propTypes = componentPropertyTypes;
ShowcaseMostWatchedVideos.defaultProps = defaultProps;

export default connector(updater(ShowcaseMostWatchedVideos));
