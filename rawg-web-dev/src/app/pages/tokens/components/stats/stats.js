import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { compose, withState, withHandlers } from 'recompose';
import { connect } from 'react-redux';
import cn from 'classnames';

import currentUserType from 'app/components/current-user/current-user.types';

import './stats.styl';
import Scroller from 'app/ui/scroller/scroller';
import { appSizeType } from 'app/pages/app/app.types';
import { lastAchievementType } from 'app/pages/tokens/tokens.data.types';
import tokensDashboardTypes from 'app/pages/tokens/tokens.types';
import { joinProgram as joinProgramAction } from 'app/pages/tokens/tokens.actions';

import Header from './components/header';
import UserInfo from './components/user-info';
import FixedPanel from './components/fixed-panel';
import ProgressBar from './components/progressbar';

const calcDaysLeft = (endString) => {
  const end = new Date(endString).getTime();
  const now = new Date().getTime();
  const timeDiff = Math.abs(now - end) / 1000;
  return Math.floor(timeDiff / (3600 * 24));
};

const calcDurability = (startString, finishedString) => {
  const start = new Date(startString).getTime();
  const finished = new Date(finishedString).getTime();
  const timeDiff = Math.abs(finished - start) / 1000;
  return Math.floor(timeDiff / (3600 * 24));
};

const hoc = compose(
  hot(module),
  connect(
    (state) => ({
      currentUser: state.currentUser,
      size: state.app.size,
      tokensDashboard: state.tokensDashboard,
      lastAchievement: state.tokensDashboardData.lastAchievement,
      joining: state.tokensDashboard.joining,
      joinErrorCode: state.tokensDashboard.join_error_code,
      requestCookies: state.app.request.cookies,
    }),
    (dispatch) => ({
      joinProgram: () => dispatch(joinProgramAction()),
    }),
  ),
  withState('fixedPanelShowed', 'setFixedPanel', false),
  withHandlers({
    showFixedPanel: ({ setFixedPanel }) => () => setFixedPanel(true),
    hideFixedPanel: ({ setFixedPanel }) => () => setFixedPanel(false),
  }),
);

const componentPropertyTypes = {
  tokensDashboard: tokensDashboardTypes.isRequired,
  lastAchievement: lastAchievementType.isRequired,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
  showFixedPanel: PropTypes.func.isRequired,
  hideFixedPanel: PropTypes.func.isRequired,
  fixedPanelShowed: PropTypes.bool.isRequired,
  joinProgram: PropTypes.func.isRequired,
  joining: PropTypes.bool.isRequired,
  joinErrorCode: PropTypes.number,
  activeSection: PropTypes.string.isRequired,
  requestCookies: PropTypes.shape(),
};

const defaultProps = {
  joinErrorCode: undefined,
  requestCookies: null,
};

const TokensDashboardStats = ({
  currentUser,
  size,
  tokensDashboard,
  lastAchievement,
  showFixedPanel,
  hideFixedPanel,
  fixedPanelShowed,
  joinProgram,
  joining,
  joinErrorCode,
  activeSection,
  requestCookies,
}) => {
  const { status } = tokensDashboard;

  return (
    <div
      className={cn('tokens__stats-container', `tokens__stats-container_${status}`, {
        'tokens__stats-container_joined': currentUser.token_program,
      })}
    >
      <div className="tokens__stats__money__container">
        <div className="tokens__stats__money" />
      </div>
      <div className="tokens__stats">
        <Header
          tokensDashboard={tokensDashboard}
          currentUser={currentUser}
          size={size}
          calcDaysLeft={calcDaysLeft}
          calcDurability={calcDurability}
        />
        <ProgressBar
          requestCookies={requestCookies}
          tokensDashboard={tokensDashboard}
          lastAchievement={lastAchievement}
        />
        {currentUser.id && currentUser.token_program && (
          <UserInfo tokensDashboard={tokensDashboard} currentUser={currentUser} size={size} />
        )}
        <Scroller onReach={{ top: showFixedPanel, bottom: hideFixedPanel }} />
        <FixedPanel
          tokensDashboard={tokensDashboard}
          currentUser={currentUser}
          joinProgram={joinProgram}
          joining={joining}
          joinErrorCode={joinErrorCode}
          calcDaysLeft={calcDaysLeft}
          calcDurability={calcDurability}
          showed={fixedPanelShowed}
          size={size}
          activeSection={activeSection}
        />
      </div>
    </div>
  );
};

TokensDashboardStats.propTypes = componentPropertyTypes;
TokensDashboardStats.defaultProps = defaultProps;

export default hoc(TokensDashboardStats);
