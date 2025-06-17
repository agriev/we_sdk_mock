import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import { compose, withProps } from 'recompose';
import { connect } from 'react-redux';
import { Element } from 'react-scroll';

import Scroller from 'app/ui/scroller';
import TokensHeader from 'app/pages/tokens/components/tokens-header';
import showTokens from 'app/pages/tokens/funcs/show-tokens';

import tokensDashboardTypes, { STATUS_ACTIVE, STATUS_COMPLETED, STATUS_FAILURE } from 'app/pages/tokens/tokens.types';

import { rewardType } from 'app/pages/tokens/tokens.data.types';
import currentUserType from 'app/components/current-user/current-user.types';

import TokensRewardHelper from './components/reward-helper';
import RewardEarnedKarma from './components/reward-earned-karma';
import RewardNotReached from './components/reward-not-reached';

import './reward.styl';

const hoc = compose(
  hot(module),
  connect((state) => ({
    currentUser: state.currentUser,
    size: state.app.size,
    tokensDashboard: state.tokensDashboard,
    reward: state.tokensDashboardData.reward,
  })),
  withProps(({ setActiveSection }) => ({
    activateSection: () => {
      setActiveSection('reward');
    },
  })),
);

const componentPropertyTypes = {
  className: PropTypes.string,
  tokensDashboard: tokensDashboardTypes.isRequired,
  currentUser: currentUserType.isRequired,
  activateSection: PropTypes.func.isRequired,
  reward: rewardType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const RewardComponent = ({ className, tokensDashboard, currentUser, activateSection, reward, dispatch }) => {
  const { status } = tokensDashboard;

  if (status === STATUS_FAILURE) {
    return null;
  }

  if (status === STATUS_COMPLETED && !currentUser.token_program) {
    return null;
  }

  const isCompleted = status === STATUS_COMPLETED;
  const position = status === STATUS_ACTIVE ? 3 : <div className="tokens__reward-coin" />;
  const headerClassName = status === STATUS_ACTIVE ? '' : 'tokens-header_coin';

  return (
    <div
      className={cn('tokens__reward', className, {
        tokens__reward_finished: status !== STATUS_ACTIVE,
      })}
    >
      <Scroller onReach={{ top: activateSection, bottom: activateSection, offset: 100 }} />
      <Element name="tokens.reward" />
      <TokensHeader className={headerClassName} position={position} title="tokens.reward_title" />
      <div className="tokens__reward-container">
        <div
          className={cn('tokens__reward-main', {
            'tokens__reward-main_completed': status === STATUS_COMPLETED,
          })}
        >
          {isCompleted ? (
            <RewardEarnedKarma
              status={status}
              reward={reward}
              tokensTotal={showTokens(currentUser)}
              dispatch={dispatch}
            />
          ) : (
            <RewardNotReached status={status} reward={reward} />
          )}
        </div>
        <TokensRewardHelper tokens={reward.tokens} />
      </div>
      <Scroller onReach={{ top: activateSection, bottom: activateSection, offset: 100 }} />
    </div>
  );
};

RewardComponent.propTypes = componentPropertyTypes;
RewardComponent.defaultProps = defaultProps;

const Reward = hoc(RewardComponent);

export default Reward;
