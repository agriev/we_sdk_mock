import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import cn from 'classnames';

import paths from 'config/paths';

import './notifications.styl';

const mapStateToProperties = (state) => ({
  notifications: state.app.feedCounters.notifications,
});

const propTypes = {
  notifications: PropTypes.number.isRequired,
};

const MaybeRateGames = ({ notifications }) => (
  <Link className="header__notifications" to={paths.notifications}>
    <div className={cn('header__notifications-icon', { withDot: notifications })} />
    {!!notifications && <div className="header__notifications__dot_red" />}
  </Link>
);

MaybeRateGames.propTypes = propTypes;

export default connect(mapStateToProperties)(MaybeRateGames);
