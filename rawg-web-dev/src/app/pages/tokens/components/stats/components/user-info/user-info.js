/* eslint-disable no-mixed-operators */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import SVGInline from 'react-svg-inline';
import { Link } from 'app/components/link';

import statsUpIcon from 'app/pages/tokens/assets/stats-up.svg';
import statsDownIcon from 'app/pages/tokens/assets/stats-down.svg';

import currentUserType from 'app/components/current-user/current-user.types';

import paths from 'config/paths';
import config from 'config/config';

import './user-info.styl';
import Avatar from 'app/ui/avatar/avatar';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import tokensDashboardTypes from 'app/pages/tokens/tokens.types';

import showTokens from 'app/pages/tokens/funcs/show-tokens';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  tokensDashboard: tokensDashboardTypes.isRequired,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
};

const UserInfo = ({ currentUser, size, tokensDashboard }) => {
  const { current_user: currentUserStats } = tokensDashboard;

  return (
    <div className="tokens__stats__user-info">
      <div className="tokens__stats__user-info__main">
        <div className="tokens__stats__user-info__avatar">
          <Avatar size={appHelper.isDesktopSize({ size }) ? 56 : 48} src={currentUser.avatar} profile={currentUser} />
        </div>
        <div className="tokens__stats__user-info__name-and-coins">
          <div className="tokens__stats__user-info__name">{currentUser.full_name || currentUser.username}</div>
          <div className="tokens__stats__user-info__footer">
            <span className="tokens__stats__user-info__coins">{showTokens(currentUser)}</span>
            {config.features.tokensExchange && (
              <Link className="tokens__stats__user-info__link" to={paths.tokensExchange} href={paths.tokensExchange}>
                <FormattedMessage id="tokens.stats_exchange_link" />
              </Link>
            )}
            <Link className="tokens__stats__user-info__link" to="/tokens/faq" href="/tokens/faq">
              <FormattedMessage id="tokens.stats_faq_link" />
            </Link>
          </div>
        </div>
      </div>
      <div className="tokens__stats__user-info__secondary">
        <div className="tokens__stats__user-info__achievements">
          <div className="tokens__stats__user-info__achievements-data">
            <div className="tokens__stats__user-info__achievements-data-overall">
              {currentUserStats.achievements}
              <span role="img" aria-label="Cup">
                🏆
              </span>
            </div>
            <div className="tokens__stats__user-info__achievements-data-gold">{currentUserStats.achievements_gold}</div>
            <div className="tokens__stats__user-info__achievements-data-silver">
              {currentUserStats.achievements_silver}
            </div>
            <div className="tokens__stats__user-info__achievements-data-bronze">
              {currentUserStats.achievements_bronze}
            </div>
          </div>
          <div className="tokens__stats__user-info__achievements-subtitle">
            <FormattedMessage id="tokens.stats_achievements_subtitle" />
          </div>
        </div>
        <div className="tokens__stats__user-info__karma">
          <div className="tokens__stats__user-info__karma-data">{currentUserStats.karma}</div>
          <div className="tokens__stats__user-info__karma-subtitle">
            <FormattedMessage id="tokens.stats_karma_subtitle" />
          </div>
        </div>
        {currentUserStats.position > 0 && (
          <div className="tokens__stats__user-info__place">
            <div className="tokens__stats__user-info__place-data">
              {currentUserStats.position}
              {currentUserStats.position_yesterday &&
                currentUserStats.position < currentUserStats.position_yesterday && <SVGInline svg={statsUpIcon} />}
              {currentUserStats.position_yesterday &&
                currentUserStats.position > currentUserStats.position_yesterday && <SVGInline svg={statsDownIcon} />}
            </div>
            <div className="tokens__stats__user-info__place-subtitle">
              <FormattedMessage id="tokens.stats_place_subtitle" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

UserInfo.propTypes = componentPropertyTypes;

export default hoc(UserInfo);
