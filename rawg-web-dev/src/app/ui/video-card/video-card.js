/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import TextTruncate from 'react-text-truncate';
import truncate from 'lodash/truncate';
import { connect } from 'react-redux';
import appHelper from 'app/pages/app/app.helper';

import resize from 'tools/img/resize';
import getAppContainer from 'tools/get-app-container';

import RenderMounted from 'app/render-props/render-mounted';

import Time from 'app/ui/time';
import CloseButton from 'app/ui/close-button';

import './video-card.styl';

const videoCardPropertyTypes = {
  video: PropTypes.shape({
    // Youtube props
    external_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    channel_title: PropTypes.string,
    name: PropTypes.string,
    created: PropTypes.string,
    thumbnails: PropTypes.shape({
      default: PropTypes.shape({
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
      }),
      sddefault: PropTypes.shape({
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
      }),
      high: PropTypes.shape({
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
      }),
      maxresdefault: PropTypes.shape({
        url: PropTypes.string,
      }),
      medium: PropTypes.shape({
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
      }),
    }),

    // Movie props
    preview: PropTypes.string,

    // Twitch props
    thumbnail: PropTypes.string,
  }).isRequired,
  kind: PropTypes.oneOf(['block', 'inline']),
  size: PropTypes.oneOf(['huge', 'big', 'medium']),
  source: PropTypes.oneOf(['movie', 'youtube', 'twitch']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  truncateChannelTitleOnMobile: PropTypes.bool,
  truncateChannelTitleOnDesktop: PropTypes.bool,
  isLiveStream: PropTypes.bool,
  deviceSize: PropTypes.string.isRequired,
};

const defaultProps = {
  kind: 'block',
  size: 'big',
  source: 'youtube',
  onClick: () => {},
  className: '',
  truncateChannelTitleOnMobile: false,
  truncateChannelTitleOnDesktop: false,
  isLiveStream: false,
};

@connect((state) => ({
  deviceSize: state.app.size,
}))
class VideoCard extends Component {
  static propTypes = videoCardPropertyTypes;

  constructor(props, context) {
    super(props, context);

    this.state = {
      popupVisible: false,
    };
  }

  get src() {
    const { source, video } = this.props;

    switch (source) {
      case 'youtube':
        return `https://youtube.com/embed/${video.external_id}`;
      case 'twitch':
        return `https://player.twitch.tv/?autoplay=false&video=${video.external_id}`;
      default:
        return '';
    }
  }

  get className() {
    const { kind, size, className } = this.props;

    return classnames('video-card', {
      [`video-card_${kind}`]: kind,
      [`video-card_${size}`]: size,
      [className]: className,
    });
  }

  showPopup = (e) => {
    const { onClick } = this.props;

    if (typeof onClick === 'function') {
      onClick(e);
      return;
    }

    if (!this.src) return;

    e.stopPropagation();
    this.setState({ popupVisible: true });
    getAppContainer().style.overflowY = 'hidden'; // eslint-disable-line no-undef
  };

  hidePopup = (e) => {
    e.stopPropagation();
    this.setState({ popupVisible: false });
    getAppContainer().style.overflowY = 'auto'; // eslint-disable-line no-undef
  };

  prevent = (e) => {
    e.stopPropagation();
  };

  renderPopup() {
    const { popupVisible } = this.state;

    if (!popupVisible || !this.src) return null;

    return (
      <div className="video-card__popup" onClick={this.hidePopup} role="button" tabIndex={0}>
        <CloseButton className="video-card__close" onClick={this.hidePopup} />
        <div className="video-card__video-wrapper" onClick={this.prevent} role="button" tabIndex={0}>
          <div className="video-card__video">
            <iframe
              allowFullScreen
              sandbox="allow-same-origin allow-forms allow-popups allow-scripts allow-presentation"
              src={this.src}
              title={`video-${this.src}`}
            />
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {
      video,
      kind,
      source,
      size,
      deviceSize,
      truncateChannelTitleOnMobile,
      truncateChannelTitleOnDesktop,
      isLiveStream,
    } = this.props;

    if (typeof video !== 'object') {
      return null;
    }

    let thumbnail;
    let name;
    let channel_title;
    let created;

    switch (source) {
      case 'movie':
        {
          const { preview } = video;
          thumbnail = resize(640, preview);
        }
        break;
      case 'youtube':
        {
          ({ name, created, channel_title } = video);
          const { thumbnails: videoThumbnail } = video;
          const blockQuality = size === 'huge' ? 'sddefault' : 'high';
          const videoThumbSize = kind === 'inline' ? 'medium' : blockQuality;
          thumbnail = videoThumbnail[videoThumbSize].url;
        }
        break;
      case 'twitch':
        {
          ({ name } = video);
          const { thumbnail: videoThumbnail } = video;
          thumbnail = videoThumbnail.replace('%{width}', '440').replace('%{height}', '250');
        }
        break;
      default:
        return null;
    }

    const backgroundImage = `url(${thumbnail})`;

    const truncateIfTrue = (bool, text) => {
      if (bool) {
        return truncate(text, { length: 15 });
      }
      return text;
    };

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            ref={(reference) => onChildReference(reference)}
            className={this.className}
            onClick={this.showPopup}
            role="button"
            tabIndex={0}
          >
            <div className="video-card__preview" style={{ backgroundImage: visible ? backgroundImage : 'none' }}>
              <div
                className="video-card__preview__hover"
                style={{ backgroundImage: visible ? backgroundImage : 'none' }}
              />
              <div className="video-card__preview-icon" />
              <div className="video-card__preview-youtube" />
            </div>
            {(name || channel_title || created || isLiveStream) && (
              <div className="video-card__meta">
                <div className="video-card__title">
                  <TextTruncate line={2} truncateText="…" text={name} />
                </div>
                <div className="video-card__channel">
                  {isLiveStream && (
                    <div className="video-card__channel-live">
                      <span /> Live
                    </div>
                  )}
                  {created && (
                    <div className="video-card__channel-date">
                      <Time date={created} />
                    </div>
                  )}
                  {channel_title && <div className="video-card__channel-separator">&#8226;</div>}
                  {channel_title && (
                    <div className="video-card__channel-title">
                      {appHelper.isDesktopSize({ size: deviceSize })
                        ? truncateIfTrue(truncateChannelTitleOnDesktop, channel_title)
                        : truncateIfTrue(truncateChannelTitleOnMobile, channel_title)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {this.renderPopup()}
          </div>
        )}
      </RenderMounted>
    );
  }
}

VideoCard.defaultProps = defaultProps;

export default VideoCard;
