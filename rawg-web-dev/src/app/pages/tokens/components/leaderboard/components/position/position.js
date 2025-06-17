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

const Position = ({ position, currentUser, size }) => {
  const achievements = (
    <div className="tokens__leaderboard__item__achievements-data">
      <div className="tokens__leaderboard__item__achievements-data-gold">{position.achievements_gold}</div>
      <div className="tokens__leaderboard__item__achievements-data-silver">{position.achievements_silver}</div>
      <div className="tokens__leaderboard__item__achievements-data-bronze">{position.achievements_bronze}</div>
    </div>
  );

  return (
    <div
      className={cn('tokens__leaderboard__item', {
        tokens__leaderboard__item_user: currentUser.id === position.user.id,
      })}
    >
      <div className="tokens__leaderboard__item__id">
        {position.position_yesterday > 0 && position.position < position.position_yesterday && (
          <SVGInline width="11px" height="6px" svg={statsUpIcon} />
        )}
        {position.position}
        {position.position_yesterday > 0 && position.position > position.position_yesterday && (
          <SVGInline width="11px" height="6px" svg={statsDownIcon} />
        )}
      </div>
      <Avatar
        className="tokens__leaderboard__item__image"
        size={appHelper.isDesktopSize({ size }) ? 56 : 48}
        src={position.user.avatar}
        profile={position.user}
      />
      <Link
        to={paths.profile(position.user.slug)}
        href={paths.profile(position.user.slug)}
        className="tokens__leaderboard__item__name"
      >
        {position.user.full_name || position.user.username}
        {appHelper.isPhoneSize({ size }) && achievements}
      </Link>
      {appHelper.isDesktopSize({ size }) && achievements}
      <div className="tokens__leaderboard__item__reward">
        <span>{position.karma}</span>
      </div>
    </div>
  );
};

Position.propTypes = componentPropertyTypes;

export default hoc(Position);
