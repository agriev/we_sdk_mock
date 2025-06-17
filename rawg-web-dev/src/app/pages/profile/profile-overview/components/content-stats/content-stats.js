import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { LineChart, Line } from 'recharts';
import { FormattedMessage } from 'react-intl';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import appHelper from 'app/pages/app/app.helper';
import Slider from 'app/ui/slider';
import Rating from 'app/ui/rating';
import { appSizeType } from 'app/pages/app/app.types';
import paths from 'config/paths';

import './content-stats.styl';

@connect((state) => ({
  size: state.app.size,
  id: state.profile.user.slug,
  stats: state.profile.stats,
  allRatings: state.app.ratings,
}))
export default class ContentStats extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    size: appSizeType.isRequired,
    stats: PropTypes.shape().isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  renderStatsLink(path, className, key, content) {
    return (
      <Link to={path} href={path} className={className} key={key}>
        {content}
      </Link>
    );
  }

  renderStatsWithoutLink(className, key, content) {
    return (
      <span className={className} key={key}>
        {content}
      </span>
    );
  }

  renderStatus(status, content, className) {
    const { id } = this.props;
    const path = paths.profileGames(id);

    return status.count
      ? this.renderStatsLink(path, className, status.status, content)
      : this.renderStatsWithoutLink(className, status.status, content);
  }

  renderRating(rating, content, className) {
    const { id } = this.props;
    const path = `${paths.profileReviews(id)}?rating=${rating.id}`;

    return rating.count
      ? this.renderStatsLink(path, className, rating.id, content)
      : this.renderStatsWithoutLink(className, rating.id, content);
  }

  renderStatsBar(percent, backgroundStyle) {
    return (
      <div className="content-stats__item-percent-wrapper">
        <div className="content-stats__item-percent-full" />
        <div
          className="content-stats__item-percent"
          style={{
            width: `${percent}%`,
            backgroundImage: backgroundStyle,
          }}
        />
      </div>
    );
  }

  renderGamesStats() {
    const {
      id,
      stats: { games },
    } = this.props;
    const { count, statuses, graph } = games;

    return (
      <div className="content-stats__stat">
        <Link
          to={paths.profileGames(id)}
          href={paths.profileGames(id)}
          className="content-stats__count"
          rel={!count ? 'nofollow' : ''}
        >
          <FormattedMessage
            id="profile.overview_content_stats_count_games"
            values={{
              value: <span className="content-stats__count-number">{count || '0'}</span>,
              count,
            }}
          />
        </Link>

        {this.renderChart('gamesChart', graph, '#4354ba', '#649bff')}

        {count > 0 ? (
          <div className="content-stats__items">
            <div className="content-stats__column">
              {statuses.map((status) => {
                const className = 'content-stats__line content-stats__item-name';
                const content = <SimpleIntlMessage id={`shared.game_menu_status_${status.status}`} />;
                return this.renderStatus(status, content, className);
              })}
            </div>
            <div className="content-stats__column content-stats__column_grow">
              {statuses.map((status) => {
                const className = 'content-stats__line';
                const content = this.renderStatsBar(status.percent, 'linear-gradient(to top, #4354ba, #649bff)');
                return this.renderStatus(status, content, className);
              })}
            </div>
            <div className="content-stats__column">
              {statuses.map((status) => {
                const className = 'content-stats__line content-stats__item-count';
                const content = status.count;
                return this.renderStatus(status, content, className);
              })}
            </div>
          </div>
        ) : (
          <div className="content-stats__empty">
            <FormattedMessage id="profile.overview_content_stats_games_empty" />
          </div>
        )}
      </div>
    );
  }

  renderReviewsStats() {
    const {
      id,
      allRatings,
      stats: { reviews },
    } = this.props;
    const { count, ratings, graph } = reviews;

    return (
      <div className="content-stats__stat">
        <Link
          to={paths.profileReviews(id)}
          href={paths.profileReviews(id)}
          className="content-stats__count"
          rel={!count ? 'nofollow' : ''}
        >
          <FormattedMessage
            id="profile.overview_content_stats_count_reviews"
            values={{
              value: <span className="content-stats__count-number">{count || '0'}</span>,
              count,
            }}
          />
        </Link>

        {this.renderChart('reviewsChart', graph, '#c92490', '#ff8ddc')}

        {count > 0 ? (
          <div className="content-stats__items">
            <div className="content-stats__column">
              {ratings.map((rating) => {
                const className = 'content-stats__line content-stats__item-name';
                const content = (
                  <Rating className="content-stats__item-emoji" rating={rating} allRatings={allRatings} kind="emoji" />
                );
                return this.renderRating(rating, content, className);
              })}
            </div>
            <div className="content-stats__column content-stats__column_grow">
              {ratings.map((rating) => {
                const className = 'content-stats__line';
                const content = this.renderStatsBar(rating.percent, 'linear-gradient(to bottom, #ff8ddc, #c92490)');
                return this.renderRating(rating, content, className);
              })}
            </div>
            <div className="content-stats__column">
              {ratings.map((rating) => {
                const className = 'content-stats__line content-stats__item-count';
                const content = rating.count;
                return this.renderRating(rating, content, className);
              })}
            </div>
          </div>
        ) : (
          <div className="content-stats__empty">
            <SimpleIntlMessage id="profile.overview_content_stats_reviews_empty" />
          </div>
        )}
      </div>
    );
  }

  renderCommentsStats() {
    const {
      id,
      stats: { collections },
    } = this.props;
    const { items, count, graph } = collections;

    return (
      <div className="content-stats__stat">
        <Link
          to={paths.profileCollections(id)}
          href={paths.profileCollections(id)}
          className="content-stats__count"
          rel={!count ? 'nofollow' : ''}
        >
          <FormattedMessage
            id="profile.overview_content_stats_count_collections"
            values={{
              value: <span className="content-stats__count-number">{count || '0'}</span>,
              count,
            }}
          />
        </Link>

        {this.renderChart('commentsChart', graph, '#f76b1c', '#fbda61')}

        {count > 0 ? (
          <div className="content-stats__items">
            <div className="content-stats__column content-stats__column_grow">
              {items.map((content) => (
                <Link
                  className="content-stats__item-link"
                  to={paths.collection(content.slug)}
                  href={paths.collection(content.slug)}
                  key={content.id}
                >
                  <div className="content-stats__line" key={content.id}>
                    <div className="content-stats__item-name">{content.name}</div>
                    <div className="content-stats__item-percent-tiny" />
                    <span className="content-stats__collection-icon" />
                    <div className="content-stats__item-count">{content.count}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="content-stats__empty">
            <FormattedMessage id="profile.overview_content_stats_collections_empty" />
          </div>
        )}
      </div>
    );
  }

  renderChart = (id, graph, color1, color2) => {
    const { min, max } = graph.reduce(
      (result, dataPoint) => ({
        min: dataPoint.count < result.min ? dataPoint.count : result.min,
        max: dataPoint.count > result.max || result.max === 0 ? dataPoint.count : result.max,
      }),
      { min: 0, max: 0 },
    );

    if (max === 0) {
      return (
        <LineChart width={240} height={50} data={graph}>
          <Line type="monotone" dataKey="count" dot={false} stroke={color1} strokeWidth={3} />
        </LineChart>
      );
    }

    const colorBreakPoint = Math.ceil(max);
    const colorBreakPointPercentage = `${(1 - (colorBreakPoint - min) / (max - min)) * 100}%`;

    return (
      <div className="content-stats__chart">
        <LineChart width={240} height={50} data={graph}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="10%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset={colorBreakPointPercentage} stopColor={color2} />
              <stop offset="100%" stopColor={color1} />
            </linearGradient>
          </defs>
          <Line type="monotone" dataKey="count" dot={false} stroke={`url(#${id})`} strokeWidth={3} />
        </LineChart>
      </div>
    );
  };

  render() {
    const {
      size,
      stats: { loading },
    } = this.props;

    if (loading) {
      return null;
    }

    return appHelper.isDesktopSize({ size }) ? (
      <div className="content-stats">
        {this.renderGamesStats()}
        {this.renderReviewsStats()}
        {this.renderCommentsStats()}
      </div>
    ) : (
      <div className="content-stats">
        <Slider
          className="content-stats__slider"
          arrows={false}
          adaptiveHeight={false}
          dots
          slidesToScroll={1}
          centerPadding="0"
          variableWidth
          infinite={false}
          swipeToSlide
        >
          {this.renderGamesStats()}
          {this.renderReviewsStats()}
          {this.renderCommentsStats()}
        </Slider>
      </div>
    );
  }
}
