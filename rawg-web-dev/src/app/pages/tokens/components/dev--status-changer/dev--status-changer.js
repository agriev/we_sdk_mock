/* eslint-disable camelcase, no-mixed-operators, unicorn/filename-case */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withHandlers, withState } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import reduce from 'lodash/reduce';

import './dev--status-changer.styl';
import Button from 'app/ui/button/button';
import { updateCurrentUser } from 'app/components/current-user/current-user.actions';
import { token_program as tokenProgramType } from 'app/components/current-user/current-user.types';
import { updateDashboard } from 'app/pages/tokens/tokens.actions';
import { status as statusType, STATUS_FAILURE, STATUS_COMPLETED, STATUS_ACTIVE } from 'app/pages/tokens/tokens.types';
import { updateDashboardData } from 'app/pages/tokens/tokens.data.actions';
import earnedAchievementsTempData from './temp-data/earned-achievements';

const calcGoals = (status) => [
  {
    achievements: 300,
    tokens: 10000,
    achieved: status !== STATUS_FAILURE,
  },
  {
    achievements: 600,
    tokens: 20000,
    achieved: status === STATUS_COMPLETED,
  },
  {
    achievements: 1000,
    tokens: 50000,
    achieved: status === STATUS_COMPLETED,
  },
];

const calcEarnedAchievements = (status) => {
  const empty = {
    count: 7,
    next: null,
    previous: null,
    loading: false,
    results: [],
  };
  switch (status) {
    case STATUS_ACTIVE:
      return earnedAchievementsTempData;
    case STATUS_COMPLETED:
      return earnedAchievementsTempData;
    case STATUS_FAILURE:
      return empty;
    default:
      return empty;
  }
};

const today = new Date();
const nDaysAgo = (n) => new Date(today.getTime() - 1000 * 3600 * 24 * n).toISOString();

const stageStatuses = {
  [STATUS_ACTIVE]: {
    title: 'Active',
    dashboard: {
      status: STATUS_ACTIVE,
      percent: 40,
      start: nDaysAgo(10),
      end: nDaysAgo(-15),
      finished: null,
      stages: calcGoals(STATUS_ACTIVE),
    },
    data: {
      earnedAchievements: calcEarnedAchievements(STATUS_ACTIVE),
    },
  },
  [STATUS_COMPLETED]: {
    title: 'Completed with success',
    dashboard: {
      status: STATUS_COMPLETED,
      percent: 100,
      start: nDaysAgo(10),
      end: nDaysAgo(2),
      finished: nDaysAgo(4),
      stages: calcGoals(STATUS_COMPLETED),
    },
    data: {
      earnedAchievements: calcEarnedAchievements(STATUS_COMPLETED),
    },
  },
  [STATUS_FAILURE]: {
    title: 'Completed with fail',
    dashboard: {
      status: STATUS_FAILURE,
      percent: 15,
      start: nDaysAgo(10),
      end: nDaysAgo(-1),
      finished: nDaysAgo(-1),
      stages: calcGoals(STATUS_FAILURE),
    },
    data: {
      earnedAchievements: calcEarnedAchievements(STATUS_FAILURE),
    },
  },
};

const hoc = compose(
  hot(module),
  connect(
    (state) => ({
      status: state.tokensDashboard.status,
      joined: state.currentUser.token_program,
    }),
    (dispatch) => ({
      updateStatus: ({ dashboard, data }) => {
        dispatch(updateDashboard(dashboard));
        dispatch(updateDashboardData(data));
      },
      updateJoined: (token_program) => dispatch(updateCurrentUser({ token_program })),
    }),
  ),
  withState('hidden', 'setHidden', false),
  withHandlers({
    onChangeStatus: (props) => (event) => {
      const { dashboard, data } = stageStatuses[event.target.value];
      props.updateStatus({ dashboard, data });
    },
    onChangeJoin: (props) => (event) => props.updateJoined(event.target.checked),
    hide: (props) => () => props.setHidden(true),
  }),
);

const componentPropertyTypes = {
  status: statusType.isRequired,
  joined: tokenProgramType.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
  onChangeJoin: PropTypes.func.isRequired,
  hide: PropTypes.func.isRequired,
  hidden: PropTypes.bool.isRequired,
};

const TokensDashboardStatusChanger = ({ status, joined, onChangeStatus, onChangeJoin, hidden, hide }) => {
  if (hidden) {
    return null;
  }

  return (
    <div className="tokens__status-changer__container">
      <div className="tokens__status-changer">
        Current stage state:
        {reduce(
          stageStatuses,
          (data, stageStatus, key) => [
            ...data,
            <label key={key} htmlFor={`radio_dashboard__status__${key}`} className="tokens__status-changer-radiobutton">
              <input
                id={`radio_dashboard__status__${key}`}
                type="radio"
                name="tokens_dashboard_status"
                value={key}
                onChange={onChangeStatus}
                checked={status === key}
              />
              {stageStatus.title}
            </label>,
          ],
          [],
        )}
        <br />
        <label htmlFor="radio_dashboard__joined" className="tokens__status-changer-radiobutton">
          <input
            id="radio_dashboard__joined"
            type="checkbox"
            name="currentuser_joined_in_program"
            value="joined"
            onChange={onChangeJoin}
            checked={joined}
          />
          Joined in program
        </label>
        <Button kind="fill" size="small" onClick={hide}>
          Hide panel
        </Button>
      </div>
    </div>
  );
};

TokensDashboardStatusChanger.propTypes = componentPropertyTypes;

export default hoc(TokensDashboardStatusChanger);
