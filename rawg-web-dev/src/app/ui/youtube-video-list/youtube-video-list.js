import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MediaDetailViewer from 'app/ui/media-detail-viewer';
import VideoCard from 'app/ui/video-card';

import './youtube-video-list.styl';

const YoutubeVideoListPropertyTypes = {
  videos: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
  truncateChannelTitleOnMobile: PropTypes.bool,
  truncateChannelTitleOnDesktop: PropTypes.bool,
};

const defaultProps = {
  className: '',
  children: null,
  truncateChannelTitleOnMobile: false,
  truncateChannelTitleOnDesktop: false,
};

class YoutubeVideoList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      detailedOpened: null,
    };
  }

  onCloseDetailViewer = () => {
    this.setState({ detailedOpened: null });
  };

  openDetailViewer = (index) => {
    this.setState({ detailedOpened: index });
  };

  render() {
    const { className, children, truncateChannelTitleOnMobile, truncateChannelTitleOnDesktop } = this.props;

    const videos = this.props.videos.map((video) => ({ ...video, type: 'youtube' }));

    if (!Array.isArray(videos) || videos.length === 0) {
      return null;
    }

    return (
      <div className={['youtube-video-list', className].join(' ')}>
        <div className="youtube-video-list__inner">
          <div className="youtube-video-list__first-video">
            <VideoCard
              video={videos[0]}
              kind="block"
              size="big"
              source="youtube"
              onClick={() => {
                this.openDetailViewer(0);
              }}
            />
          </div>
          <div className="youtube-video-list__other-videos">
            {videos.slice(1, children ? 6 : 7).map((video, index) => (
              <VideoCard
                key={video.id}
                className="youtube-video-list__other-video"
                video={video}
                kind="inline"
                size="medium"
                source="youtube"
                truncateChannelTitleOnMobile={truncateChannelTitleOnMobile}
                truncateChannelTitleOnDesktop={truncateChannelTitleOnDesktop}
                onClick={() => {
                  this.openDetailViewer(index + 1);
                }}
              />
            ))}
            {children}
          </div>
        </div>
        {this.state.detailedOpened !== null && (
          <MediaDetailViewer
            activeIndex={this.state.detailedOpened}
            content="youtube"
            onClose={this.onCloseDetailViewer}
            items={videos}
          />
        )}
      </div>
    );
  }
}

YoutubeVideoList.propTypes = YoutubeVideoListPropertyTypes;
YoutubeVideoList.defaultProps = defaultProps;

export default YoutubeVideoList;
