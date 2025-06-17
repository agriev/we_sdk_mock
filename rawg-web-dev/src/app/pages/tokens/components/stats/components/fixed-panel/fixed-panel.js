/* eslint-disable no-mixed-operators */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import maxBy from 'lodash/maxBy';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import { Link as ScrollLink } from 'react-scroll';

import statsUpIcon from 'app/pages/tokens/assets/stats-up.svg';
import statsDownIcon from 'app/pages/tokens/assets/stats-down.svg';

import currentUserType from 'app/components/current-user/current-user.types';

import './fixed-panel.styl';
import Button from 'app/ui/button/button';
import Avatar from 'app/ui/avatar/avatar';
import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import RoundProgressbar from 'app/ui/round-progressbar';

import tokensDashboardTypes, { STATUS_ACTIVE, STATUS_COMPLETED, STATUS_FAILURE } from 'app/pages/tokens/tokens.types';

const scrollOffset = -50;
const scrollDuration = 0;

const hoc = compose(hot(module));

const componentPropertyTypes = {
  tokensDashboard: tokensDashboardTypes.isRequired,
  currentUser: currentUserType.isRequired,
  calcDaysLeft: PropTypes.func.isRequired,
  calcDurability: PropTypes.func.isRequired,
  showed: PropTypes.bool.isRequired,
  size: appSizeType.isRequired,
  joinProgram: PropTypes.func.isRequired,
  joining: PropTypes.bool.isRequired,
  joinErrorCode: PropTypes.number,
  activeSection: PropTypes.string.isRequired,
};

const defaultProps = {
  joinErrorCode: undefined,
};

const FixedPanel = ({
  currentUser,
  tokensDashboard,
  showed,
  joinProgram,
  joining,
  joinErrorCode,
  calcDaysLeft,
  calcDurability,
  size,
  activeSection,
}) => {
  const { status, stages, current_user: currentUserStats, achievements, start, end, finished } = tokensDashboard;
  const maxAchievements = (maxBy(stages, 'achievements') || {}).achievements || 0;

  const getLinksOrder = () => {
    switch (status) {
      case STATUS_ACTIVE:
        return ['achievements', 'recommended', 'leaderboard', 'reward', 'offers'];
      case STATUS_COMPLETED:
        if (currentUser.token_program) {
          return ['reward', 'offers', 'achievements', 'leaderboard'];
        }
        return ['offers', 'leaderboard'];
      case STATUS_FAILURE:
        return ['offers', 'leaderboard'];
      default:
        return [];
    }
  };

  return (
    <div
      className={cn('tokens__stats-fixed-container', `tokens__stats-fixed-container_${status}`, {
        'tokens__stats-fixed_showed': showed,
      })}
    >
      <div className="tokens__stats-fixed">
        <div className="tokens__stats-fixed__achievements">
          <RoundProgressbar percent={25} squareSize={24} strokeWidth={4} />
          {appHelper.isDesktopSize({ size }) ? `${achievements} / ${maxAchievements}` : achievements}
        </div>
        {[STATUS_ACTIVE, STATUS_COMPLETED].includes(status) && (
          <div className="tokens__stats-fixed__time-left">
            {status === STATUS_ACTIVE && (
              <FormattedMessage id="tokens.days_left" values={{ count: calcDaysLeft(end) }} />
            )}
            {status === STATUS_COMPLETED && (
              <FormattedMessage id="tokens.done_for_n_days" values={{ count: calcDurability(start, finished) }} />
            )}
          </div>
        )}
        <div className="tokens__stats-fixed__navigation">
          {getLinksOrder().map((item) => (
            <ScrollLink
              className={cn('tokens__stats-fixed__navigation-el', {
                active: activeSection === item,
              })}
              key={item}
              to={`tokens.${item}`}
              offset={scrollOffset}
              duration={scrollDuration}
              smooth
              spy
            >
              <FormattedMessage id={`tokens.fixed_panel_${item}`} />
            </ScrollLink>
          ))}
        </div>
        {currentUser.id &&
          currentUser.token_program && [
            <div key="avatar" className="tokens__stats-fixed__avatar">
              <Avatar size={24} src={currentUser.avatar} profile={currentUser} />
            </div>,
            currentUserStats.position > 0 && (
              <div key="position" className="tokens__stats-fixed__place">
                {currentUserStats.position}
                {currentUserStats.position_yesterday &&
                  currentUserStats.position < currentUserStats.position_yesterday && <SVGInline svg={statsUpIcon} />}
                {currentUserStats.position_yesterday &&
                  currentUserStats.position > currentUserStats.position_yesterday && <SVGInline svg={statsDownIcon} />}
              </div>
            ),
            <div key="user-achievements" className="tokens__stats-fixed__user-achievements">
              <FormattedMessage id="tokens.data_overall" values={{ count: currentUserStats.achievements }} />
            </div>,
            <div key="user-karma" className="tokens__stats-fixed__user-karma">
              {currentUserStats.karma}
            </div>,
          ]}
        {!currentUser.token_program && (
          <Button
            className="tokens__stats-fixed__join-btn"
            kind="fill"
            size="small"
            onClick={joinProgram}
            loading={joining}
            disabled={joining}
          >
            {!joinErrorCode && <FormattedMessage id="tokens.join" />}
            {!joinErrorCode && joining && <FormattedMessage id="tokens.notifications_action_joining" />}
            {joinErrorCode && <FormattedMessage id="tokens.notifications_action_join_error" />}
          </Button>
        )}
      </div>
    </div>
  );
};

FixedPanel.propTypes = componentPropertyTypes;
FixedPanel.defaultProps = defaultProps;

export default hoc(FixedPanel);
