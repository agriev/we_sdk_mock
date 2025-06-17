import React from 'react';
import PropTypes from 'prop-types';

import './years-stats-decades.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  timeline: PropTypes.arrayOf(PropTypes.object),
};

const defaultProps = {
  className: '',
  timeline: [],
};

const YearsStatsDecades = ({ className, timeline }) => (
  <div className={['years-stats-decades', className].join(' ')}>
    <span>1960</span>
    <span>1970</span>
    <span>1980</span>
    <span>1990</span>
    <span>2000</span>
    <span>2010</span>
    <span>{timeline[timeline.length - 1].year}</span>
  </div>
);

YearsStatsDecades.propTypes = componentPropertyTypes;

YearsStatsDecades.defaultProps = defaultProps;

export default YearsStatsDecades;
