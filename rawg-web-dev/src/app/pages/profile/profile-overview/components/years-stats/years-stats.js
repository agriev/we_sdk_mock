import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import YearsStatsChart from 'app/ui/years-stats/years-stats-chart';
import YearsStatsChartEmpty from 'app/ui/years-stats/years-stats-chart-empty';

import './years-stats.styl';

import { appSizeType } from 'app/pages/app/app.types';
import ProfileTitle from '../profile-title';

const hoc = compose(
  connect((state) => ({
    size: state.app.size,
    profile: state.profile,
  })),
);

const componentPropertyTypes = {
  size: appSizeType.isRequired,
  profile: PropTypes.shape().isRequired,
};

const YearsStatsComponent = ({ size, profile }) => {
  const notEmpty = profile.stats.timeline.some((time) => time.count > 0);

  return (
    <div className="profile-years-stats">
      <ProfileTitle id="profile.overview_years_stats_title" />
      {notEmpty ? (
        <div>
          <YearsStatsChart
            timeline={profile.stats.timeline}
            size={size}
            id={profile.user.username}
            years={profile.years}
          />
        </div>
      ) : (
        <YearsStatsChartEmpty />
      )}
    </div>
  );
};

YearsStatsComponent.propTypes = componentPropertyTypes;

const YearsStats = hoc(YearsStatsComponent);

export default YearsStats;
