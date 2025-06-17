import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import './social.styl';

import SocialLinks from 'app/ui/social-links';
import Time from 'app/ui/time';

import { appLocaleType } from 'app/pages/app/app.types';

const propTypes = {
  news: PropTypes.shape({
    title: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    date: PropTypes.string,
  }).isRequired,
  showDate: PropTypes.bool,
  locale: appLocaleType.isRequired,
};

const defaultProps = {
  showDate: false,
};

@connect((state) => ({
  news: state.showcase.news,
  locale: state.app.locale,
}))
export default class ShowcaseSocial extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  shouldComponentUpdate(nextProperties) {
    return (
      nextProperties.news.title !== this.props.news.title ||
      nextProperties.news.link !== this.props.news.link ||
      nextProperties.news.date !== this.props.news.date
    );
  }

  render() {
    const { news, showDate, locale } = this.props;
    const { title, link, date } = news;

    return (
      <div className="showcase-social">
        <div className="showcase-social__public">
          <div className="showcase-social__title">
            <FormattedMessage id="showcase.social_title" />
          </div>
          <SocialLinks locale={locale} className="showcase-social__links" />
        </div>
        {title && (
          <a className="showcase-social__news" href={link} target="_blank" rel="nofollow noopener noreferrer">
            <span className="showcase-social__news-icon" />
            <div className="showcase-social__news-text">
              <span>
                {title}
                {showDate && (
                  <span className="showcase-social__news-date">
                    <Time date={date} />
                  </span>
                )}
              </span>
            </div>
          </a>
        )}
      </div>
    );
  }
}
