/* eslint-disable no-mixed-operators */

import React from 'react';
import PropTypes from 'prop-types';
import range from 'lodash/range';

import './years-stats-chart-empty.styl';

import getCurrentYear from 'tools/dates/current-year';

import RenderDecades from '../years-stats-decades';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const YearsStatsChartEmpty = ({ className }) => {
  const timeline = range(1980, getCurrentYear() + 1).map((year) => ({
    year,
    count: Math.floor(Math.random() * 100),
  }));
  const total = 150;

  return (
    <div
      className={['years-stats-chart-empty', className].join(' ')}
      // ref="emptyChart"
    >
      <div className="years-stats-chart-empty__chart">
        {timeline.map(({ year, count }) => (
          <div className="years-stats-chart-empty__bar" key={year}>
            <div
              className="years-stats-chart__bar years-stats-chart-empty__transparent"
              style={{
                height: `calc(10px + ${(count / total) * 100}%)`,
              }}
            />
            <div className="years-stats-chart__bar years-stats-chart-empty__transparent" />
          </div>
        ))}
      </div>
      <RenderDecades timeline={timeline} />
    </div>
  );
};

YearsStatsChartEmpty.propTypes = componentPropertyTypes;

YearsStatsChartEmpty.defaultProps = defaultProps;

export default YearsStatsChartEmpty;
