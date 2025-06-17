import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import VideoCard from 'app/ui/video-card';
import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';
import appHelper from 'app/pages/app/app.helper';
import MediaDetailViewer from 'app/ui/media-detail-viewer';
import Heading from 'app/ui/heading';

import twitchLogo from 'assets/icons/twitch.png';
import twitchLogo2x from 'assets/icons/twitch@2x.png';
import twitchLogo3x from 'assets/icons/twitch@3x.png';

import './streams.styl';

const componentPropertyTypes = {
  twitch: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  size: PropTypes.string.isRequired,
};

const defaultProps = {};

@connect((state) => ({
  twitch: state.showcase.twitch.results,
  size: state.app.size,
}))
class ShowcaseStreams extends React.PureComponent {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

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
    const { twitch, size } = this.props;
    const videos = twitch.map((video) => ({ ...video, type: 'twitch' }));

    if (!videos || videos.length === 0) return null;

    return (
      <div className="showcase-streams">
        <Heading rank={2}>
          <span className="showcase-streams__title">
            <SimpleIntlMessage id="showcase.streams_title" />
            <img
              className="showcase-streams__logo"
              src={twitchLogo}
              srcSet={`${twitchLogo2x} 2x, ${twitchLogo3x} 3x`}
              alt="Twitch"
            />
          </span>
        </Heading>
        <Slider
          className="showcase-streams__slider"
          arrows={appHelper.isDesktopSize({ size }) && videos.length > 4}
          nextArrow={<SliderArrow arrowClassName="showcase-streams__slider-arrow" direction="next" />}
          prevArrow={<SliderArrow arrowClassName="showcase-streams__slider-arrow" direction="prev" />}
          adaptiveHeight={false}
          dots={false}
          variableWidth
          infinite={videos.length > 4}
          slidesToScroll={appHelper.isDesktopSize({ size }) ? 4 : 1}
          swipeToSlide
        >
          {videos.map((video, index) => (
            <VideoCard
              className="showcase-streams__twitch-item"
              video={video}
              onClick={() => {
                this.openDetailViewer(index);
              }}
              kind="block"
              size="medium"
              source="twitch"
              key={video.id}
              isLiveStream
            />
          ))}
        </Slider>
        {this.state.detailedOpened !== null && (
          <div>
            <MediaDetailViewer
              activeIndex={this.state.detailedOpened}
              content="twitch"
              onClose={this.onCloseDetailViewer}
              items={videos}
            />
          </div>
        )}
      </div>
    );
  }
}

export default ShowcaseStreams;
