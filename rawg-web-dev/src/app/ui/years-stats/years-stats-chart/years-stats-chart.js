/* eslint-disable no-mixed-operators */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import { compose, pure } from 'recompose';

import paths from 'config/paths';

import Tooltip from 'app/ui/tooltip';

import './years-stats-chart.styl';

const hoc = compose(
  hot(module),
  pure,
);

const componentPropertyTypes = {
  className: PropTypes.string,
  id: PropTypes.string,
  years: PropTypes.arrayOf(PropTypes.object),
  timeline: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number,
      count: PropTypes.number,
      decade: PropTypes.bool,
    }),
  ),
};

const defaultProps = {
  className: '',
  id: '',
  years: [],
  timeline: {},
};

class YearsStatsChartComponent extends Component {
  static propTypes = componentPropertyTypes;

  componentDidMount() {
    const chart = window.document.getElementById('graphChart');
    if (chart) {
      chart.scrollLeft = 650;
    }
  }

  getFilter = (year) => {
    try {
      return encodeURIComponent(JSON.stringify({ dates: [`${year}-01-01,${year}-12-31`] }));
    } catch (e) {
      return '';
    }
  };

  render() {
    const { id, years, timeline, className } = this.props;

    const getMaxElement = (previous, current) => (previous.count >= current.count ? previous : current);
    const maxElement = timeline.reduce(getMaxElement);
    const maxCount = maxElement.count;

    return (
      <div id="graphChart" className={['years-stats-chart', className].join(' ')}>
        <div className="years-stats-chart__chart">
          {timeline.map(({ year, count }, idx) => {
            const dates = count > 0 && years.length && years.find((yearsF) => yearsF.to >= year && yearsF.from <= year);

            const tooltipClassName = cn('years-stats-chart__bar-tooltip', {
              'years-stats-chart__bar-tooltip-max-value': year === maxElement.year,
            });

            const yearStatsChartClassName = cn('years-stats-chart__bar', {
              'years-stats-chart__bar-max-value': year === maxElement.year,
            });

            const toolTip = <Tooltip className={tooltipClassName}>{`${year}: ${count}`}</Tooltip>;
            const yearText =
              idx === 0 || year % 10 === 0 || timeline.length - 1 === idx ? (
                <div className="years-stats-chart__bar__year-text">{year}</div>
              ) : null;
            const chartStyle = { height: `calc(10px + ${(count / maxCount) * 100}%)` };

            if (dates && dates.filter && id) {
              const linkTo = `${paths.profileGames(id)}?filter=${this.getFilter(year)}`;
              return (
                <Link
                  to={linkTo}
                  href={linkTo}
                  className={cn(yearStatsChartClassName, 'years-stats-chart__bar-link')}
                  key={year}
                  style={chartStyle}
                  rel="nofollow"
                >
                  {toolTip}
                  {yearText}
                </Link>
              );
            }

            return (
              <div className={yearStatsChartClassName} key={year} style={chartStyle}>
                {toolTip}
                {yearText}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

YearsStatsChartComponent.defaultProps = defaultProps;

const YearsStatsChart = hoc(YearsStatsChartComponent);

export default YearsStatsChart;
