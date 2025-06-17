import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import PlatformsStats from 'app/ui/platform-stats';

import './platforms-stats.styl';

import appHelper from 'app/pages/app/app.helper';
import ProfileTitle from '../profile-title';

const componentPropertyTypes = {
  size: PropTypes.string,
  stats: PropTypes.shape({ platforms: PropTypes.object }),
  profileUserSlug: PropTypes.string,
  currentUserSlug: PropTypes.string.isRequired,
};

const defaultProps = {
  size: 'desktop',
  stats: { platforms: {} },
  profileUserSlug: '',
};

@connect((state) => ({
  size: state.app.size,
  stats: state.profile.stats,
  profileUserSlug: state.profile.user.slug,
  currentUserSlug: state.currentUser.slug,
}))
class ProfilePlatformsStats extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  render() {
    const { size, profileUserSlug, currentUserSlug } = this.props;
    const platformsCount = this.props.stats.platforms.count;
    const platformType = appHelper.isDesktopSize({ size }) || platformsCount === 0 ? 'big' : 'rows';

    return (
      <div className="profile-platforms-stats">
        <ProfileTitle id="profile.overview_platforms_stats_title" />
        <PlatformsStats
          profileUserSlug={profileUserSlug}
          currentUserSlug={currentUserSlug}
          type={platformType}
          size={size}
          platforms={this.props.stats.platforms}
        />
      </div>
    );
  }
}

export default ProfilePlatformsStats;
