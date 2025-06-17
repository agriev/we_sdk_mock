/* eslint-disable no-mixed-operators */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';

import currentUserType from 'app/components/current-user/current-user.types';

import './header.styl';

import UserListLine from 'app/ui/user-list-line';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

import tokensDashboardTypes, { STATUS_ACTIVE, STATUS_COMPLETED } from 'app/pages/tokens/tokens.types';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  tokensDashboard: tokensDashboardTypes.isRequired,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
  calcDaysLeft: PropTypes.func.isRequired,
  calcDurability: PropTypes.func.isRequired,
};

const Header = ({ currentUser, size, tokensDashboard, calcDaysLeft, calcDurability }) => {
  const { last_users: lastUsers, joined: joinedCount, status, achievements, start, end, finished } = tokensDashboard;

  const joinedData = {
    results: lastUsers,
    count: joinedCount,
  };

  const showUsersList =
    appHelper.isDesktopSize({ size }) &&
    ((currentUser.token_program && status === STATUS_ACTIVE) || status !== STATUS_ACTIVE);

  return (
    <div className="tokens__stats__header">
      <div className="tokens__stats__header__title">
        <span role="img" aria-label="cup" className="tokens__stats__header__title__cup">
          🏆
        </span>
        <FormattedMessage id="tokens.stats_header_title" values={{ count: achievements }} />
      </div>
      {showUsersList && (
        <UserListLine
          className="tokens__stats__header__users"
          users={joinedData}
          textMessageId="tokens.stats_users_count"
        />
      )}
      {[STATUS_ACTIVE, STATUS_COMPLETED].includes(status) && (
        <div className="tokens__stats__header__time-left">
          {status === STATUS_ACTIVE && <FormattedMessage id="tokens.days_left" values={{ count: calcDaysLeft(end) }} />}
          {status === STATUS_COMPLETED && (
            <FormattedMessage id="tokens.done_for_n_days" values={{ count: calcDurability(start, finished) }} />
          )}
        </div>
      )}
    </div>
  );
};

Header.propTypes = componentPropertyTypes;

export default hoc(Header);
