import React from 'react';
// import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import './position.styl';

import statsUpIcon from 'app/pages/tokens/assets/stats-up.svg';
import statsDownIcon from 'app/pages/tokens/assets/stats-down.svg';

import { appSizeType } from 'app/pages/app/app.types';
import Avatar from 'app/ui/avatar/avatar';
import currentUserType from 'app/components/current-user/current-user.types';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import { leaderboardPositionType } from 'app/pages/tokens/tokens.data.types';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  position: leaderboardPositionType.isRequired,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
};

const LeaderboardPositionComponent = ({ position, currentUser, size }) => {
  return (
    <div
      className={cn('leaderboard__item', {
        leaderboard__item_user: currentUser.id === position.user.id,
      })}
    >
      <div className="leaderboard__item__id">
        {position.position_yesterday > 0 && position.position < position.position_yesterday && (
          <SVGInline width="11px" height="6px" svg={statsUpIcon} />
        )}
        {position.position}
        {position.position_yesterday > 0 && position.position > position.position_yesterday && (
          <SVGInline width="11px" height="6px" svg={statsDownIcon} />
        )}
      </div>
      <Link to={paths.profile(position.user.slug)} className="leaderboard__item__image">
        <Avatar size={appHelper.isDesktopSize({ size }) ? 56 : 48} src={position.user.avatar} profile={position.user} />
      </Link>
      <div className="leaderboard__item__name">
        <Link to={paths.profile(position.user.slug)}>
          {position.user.full_name || position.user.username}
          <span className="leaderboard__item__name__medal">
            {position.position === 1 && '🥇'}
            {position.position === 2 && '🥈'}
            {position.position === 3 && '🥉'}
          </span>
        </Link>
      </div>
      <div className="leaderboard__item__count-per-day">{position.editing_count_per_day}</div>
      <div className="leaderboard__item__count-per-month">{position.editing_count}</div>
    </div>
  );
};

LeaderboardPositionComponent.propTypes = componentPropertyTypes;

const LeaderboardPosition = hoc(LeaderboardPositionComponent);

export default LeaderboardPosition;
