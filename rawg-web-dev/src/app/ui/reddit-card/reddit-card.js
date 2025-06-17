import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import HtmlTruncate from 'react-truncate-html';
import TextTruncate from 'react-text-truncate';

import appHelper from 'app/pages/app/app.helper';
import Time from 'app/ui/time';

import './reddit-card.styl';

const achievementCardPropertyTypes = {
  className: PropTypes.string,
  showText: PropTypes.bool,
  size: PropTypes.oneOf(['desktop', 'phone']),
  post: PropTypes.shape({
    id: PropTypes.number.isRequired,
    created: PropTypes.string.isRequired,
    image: PropTypes.string,
    name: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    username_url: PropTypes.string.isRequired,
  }).isRequired,
};

const achievementCardDefaultProperties = {
  size: 'desktop',
};

export default class RedditCard extends Component {
  static propTypes = achievementCardPropertyTypes;

  static defaultProps = achievementCardDefaultProperties;

  static defaultProps = {
    className: '',
    showText: true,
  };

  get className() {
    const { className } = this.props;

    return classnames('reddit-card', {
      [className]: className,
    });
  }

  renderMeta = () => {
    const { created, username } = this.props.post;
    return (
      <div className="reddit-card__meta">
        {created && (
          <div className="reddit-card__date">
            <Time date={created} />
          </div>
        )}
        <div className="reddit-card__meta-separator">&#8226;</div>
        <div className="reddit-card__user">{username.split('/').pop()}</div>
      </div>
    );
  };

  render() {
    const { post, showText, size } = this.props;
    const { name, text, image, url } = post;

    return (
      <div className={this.className}>
        <div
          role="button"
          tabIndex="0"
          className="reddit-card__header"
          onClick={() => {
            window.open(url, '_blank');
          }}
        >
          {image && <div className="reddit-card__image" style={{ backgroundImage: `url(${image})` }} />}
          <div className={['reddit-card__title', !image ? 'reddit-card__title-no-image' : ''].join(' ')}>
            <TextTruncate line={2} truncateText="…" text={name || ''} />
            {appHelper.isPhoneSize({ size }) && this.renderMeta()}
          </div>
        </div>
        {showText && text && (
          <div className="reddit-card__text">
            <HtmlTruncate
              lines={5}
              dangerouslySetInnerHTML={{
                __html: text.replace(/<\/?[^>]+(>|$)/g, ''),
              }}
            />
          </div>
        )}
        {appHelper.isDesktopSize({ size }) && this.renderMeta()}
      </div>
    );
  }
}
