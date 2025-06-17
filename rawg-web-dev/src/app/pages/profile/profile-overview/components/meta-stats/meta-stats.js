/* eslint-disable no-mixed-operators */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import range from 'lodash/range';

import './meta-stats.styl';

import appHelper from 'app/pages/app/app.helper';
import Slider from 'app/ui/slider';
import { appSizeType } from 'app/pages/app/app.types';

@connect((state) => ({
  size: state.app.size,
  stats: state.profile.stats,
}))
export default class MetaStats extends Component {
  static propTypes = {
    stats: PropTypes.shape().isRequired,
    size: appSizeType.isRequired,
  };

  renderDevelopersStats() {
    const {
      stats: { developers },
    } = this.props;
    const { total: count, results } = developers;

    return (
      <div className="meta-stats__stat">
        <div className="meta-stats__count">
          <FormattedMessage
            id="profile.overview_meta_stats_count_developers"
            values={{
              value: <span className="meta-stats__count-number">{count || '0'}</span>,
              count,
            }}
          />
        </div>

        {count > 0 ? (
          <div className="meta-stats__column">
            {results.map((developer, index) =>
              this.renderLine({
                index,
                title: developer.developer.name,
                count: developer.count,
                percent: developer.percent,
                color1: '#ff8ddc',
                color2: '#c92490',
              }),
            )}
          </div>
        ) : (
          <div className="meta-stats__column">
            {range(5).map((index) =>
              this.renderEmptyLine({
                index,
                color1: '#ff8ddc',
                color2: '#c92490',
              }),
            )}
          </div>
        )}
      </div>
    );
  }

  renderGenresStats() {
    const {
      stats: { genres },
    } = this.props;
    const { total: count, results } = genres;

    return (
      <div className="meta-stats__stat">
        <div className="meta-stats__count">
          <FormattedMessage
            id="profile.overview_meta_stats_count_genres"
            values={{
              value: <span className="meta-stats__count-number">{count || '0'}</span>,
              count,
            }}
          />
        </div>

        {count > 0 ? (
          <div className="meta-stats__column">
            {results.map((genre, index) =>
              this.renderLine({
                index,
                title: genre.genre.name,
                count: genre.count,
                percent: genre.percent,
                color1: '#4354ba',
                color2: '#649bff',
              }),
            )}
          </div>
        ) : (
          <div className="meta-stats__column">
            {range(5).map((index) =>
              this.renderEmptyLine({
                index,
                color1: '#649bff',
                color2: '#4354ba',
              }),
            )}
          </div>
        )}
      </div>
    );
  }

  renderLine = ({ index, title, count, percent, color1, color2 }) => (
    <div className="meta-stats__line" key={index}>
      <div className="meta-stats__line-info">
        <div className="meta-stats__line-index">{index + 1}</div>
        <div className="meta-stats__line-title">{title}</div>
        <div className="meta-stats__line-count">
          <FormattedMessage id="profile.overview_meta_stats_count_games" values={{ count }} />
        </div>
      </div>
      <div className="meta-stats__line-percent-wrapper">
        <div
          className="meta-stats__line-percent"
          style={{
            width: `${percent}%`,
            backgroundImage: `linear-gradient(to left, ${color2}, ${color1})`,
          }}
        />
      </div>
    </div>
  );

  renderEmptyLine({ index, color1, color2 }) {
    const { size } = this.props;

    return (
      <div className="meta-stats__line meta-stats__line_empty" key={index}>
        <div className="meta-stats__line-info">
          <div className="meta-stats__line-index">{index + 1}</div>
          <div
            className="meta-stats__line-percent-wrapper"
            style={{
              width: `${((appHelper.isDesktopSize({ size }) ? 360 : 240) * (100 - index * 20)) / 100}px`,
              backgroundColor: color1,
            }}
          />
          <div
            className="meta-stats__line-percent"
            style={{
              backgroundImage: `linear-gradient(to left, ${color2}, ${color1})`,
            }}
          />
        </div>
      </div>
    );
  }

  render() {
    const {
      size,
      stats: { loading },
    } = this.props;

    if (loading) {
      return null;
    }

    return appHelper.isDesktopSize({ size }) ? (
      <div className="meta-stats">
        {this.renderDevelopersStats()}
        {this.renderGenresStats()}
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
          {this.renderDevelopersStats()}
          {this.renderGenresStats()}
        </Slider>
      </div>
    );
  }
}
